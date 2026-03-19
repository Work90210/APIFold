import type { AuthMode } from '@apifold/types';

import type { Logger } from '../observability/logger.js';
import type { ServerRegistry, L0ServerMeta } from '../registry/server-registry.js';
import type { ToolDefinition } from '../registry/tool-loader.js';

const VALID_AUTH_MODES = new Set<string>(['none', 'api_key', 'bearer']);

const BLOCKED_HOSTNAMES = new Set([
  'localhost', '0.0.0.0', '::1', '[::1]',
]);

function validateAuthMode(value: string): AuthMode {
  if (!VALID_AUTH_MODES.has(value)) {
    throw new Error(`Invalid auth_mode: ${value}`);
  }
  return value as AuthMode;
}

function validateBaseUrl(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('Invalid base_url');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('base_url must use http or https');
  }
  // SSRF protection: block private/internal hosts in production.
  // In development/test, allow local upstreams for testing.
  const allowPrivate = process.env['NODE_ENV'] !== 'production';
  if (!allowPrivate) {
    const hostname = parsed.hostname.toLowerCase();
    if (
      BLOCKED_HOSTNAMES.has(hostname) ||
      hostname.startsWith('127.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('169.254.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('fc00:') ||
      hostname.startsWith('fe80:')
    ) {
      throw new Error('base_url targets a private or internal host');
    }
  }
  return raw;
}

export interface DbClient {
  query<T>(sql: string, params?: readonly unknown[]): Promise<{ readonly rows: readonly T[] }>;
}

export interface PostgresLoaderDeps {
  readonly db: DbClient;
  readonly logger: Logger;
  readonly registry: ServerRegistry;
}

/** Load all active servers into L0 registry on startup. */
export async function loadAllServers(deps: PostgresLoaderDeps): Promise<void> {
  const { db, logger, registry } = deps;

  const { rows } = await db.query<ServerRow>(
    `SELECT id, slug, user_id, auth_mode, base_url, rate_limit, is_active
     FROM mcp_servers
     WHERE is_active = true`,
  );

  const servers: L0ServerMeta[] = rows.map((row) =>
    Object.freeze({
      id: row.id,
      slug: row.slug,
      userId: row.user_id,
      authMode: validateAuthMode(row.auth_mode),
      baseUrl: validateBaseUrl(row.base_url),
      rateLimit: row.rate_limit,
      isActive: row.is_active,
    }),
  );

  registry.loadAll(servers);
  logger.info({ count: servers.length }, 'Postgres bulk load complete');
}

/** Reload a single server by ID (used during fallback polling and Redis events). */
export async function reloadServer(
  deps: PostgresLoaderDeps,
  serverId: string,
): Promise<L0ServerMeta | null> {
  const { db, registry } = deps;

  const { rows } = await db.query<ServerRow>(
    `SELECT id, slug, user_id, auth_mode, base_url, rate_limit, is_active
     FROM mcp_servers
     WHERE id = $1`,
    [serverId],
  );

  const row = rows[0];
  if (!row || !row.is_active) {
    registry.remove(serverId);
    return null;
  }

  const server: L0ServerMeta = Object.freeze({
    id: row.id,
    slug: row.slug,
    userId: row.user_id,
    authMode: validateAuthMode(row.auth_mode),
    baseUrl: validateBaseUrl(row.base_url),
    rateLimit: row.rate_limit,
    isActive: row.is_active,
  });

  registry.upsert(server);
  return server;
}

/** Fetch tool definitions for a server (used by ToolLoader). */
export async function fetchToolsForServer(
  db: DbClient,
  serverId: string,
): Promise<readonly ToolDefinition[]> {
  const { rows } = await db.query<ToolRow>(
    `SELECT id, name, description, input_schema
     FROM mcp_tools
     WHERE server_id = $1 AND is_active = true`,
    [serverId],
  );

  return rows.map((row) =>
    Object.freeze({
      id: row.id,
      name: row.name,
      description: row.description,
      inputSchema: row.input_schema as Record<string, unknown>,
    }),
  );
}

/** Fetch decrypted credential headers for a server. */
export async function fetchCredentialHeaders(
  db: DbClient,
  serverId: string,
  decryptFn: (encrypted: string) => string,
): Promise<Readonly<Record<string, string>>> {
  const { rows } = await db.query<CredentialRow>(
    `SELECT encrypted_key, auth_type, expires_at
     FROM credentials
     WHERE server_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [serverId],
  );

  const row = rows[0];
  if (!row) {
    return Object.freeze({});
  }

  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return Object.freeze({});
  }

  let plaintext: string;
  try {
    plaintext = decryptFn(row.encrypted_key);
  } catch {
    throw new Error('Credential decryption failed');
  }

  if (row.auth_type === 'bearer') {
    return Object.freeze({ Authorization: `Bearer ${plaintext}` });
  }

  if (row.auth_type === 'api_key') {
    return Object.freeze({ 'X-API-Key': plaintext });
  }

  throw new Error(`Unsupported auth type: ${row.auth_type}`);
}

interface ServerRow {
  readonly id: string;
  readonly slug: string;
  readonly user_id: string;
  readonly auth_mode: string;
  readonly base_url: string;
  readonly rate_limit: number;
  readonly is_active: boolean;
}

interface ToolRow {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly input_schema: unknown;
}

interface CredentialRow {
  readonly encrypted_key: string;
  readonly auth_type: string;
  readonly expires_at: string | null;
}
