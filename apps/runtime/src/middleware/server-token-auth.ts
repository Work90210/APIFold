import { scryptSync, timingSafeEqual } from 'node:crypto';

import type { RequestHandler } from 'express';

import type { ServerRegistry } from '../registry/server-registry.js';

const ENDPOINT_ID_PATTERN = /^[a-f0-9]{12}$/;

const GLOBAL_API_KEY_SALT = 'apifold:mcp:global-api-key:v1';
const SERVER_TOKEN_SALT = 'apifold:mcp:server-token:v1';

/**
 * Per-server access token authentication middleware.
 *
 * Each server has its own `af_`-prefixed bearer token. A derived hash is
 * stored in the L0 registry. The middleware extracts the token from:
 *   1. `Authorization: Bearer af_xxx` header (preferred)
 *   2. `?token=af_xxx` query parameter (for SSE clients that can't set headers)
 *
 * Authentication flow:
 *   - Server has `tokenHash` → token MUST match (per-server auth)
 *   - Server has no `tokenHash` → fall back to global `MCP_API_KEY`
 *   - Neither configured → reject (zero-trust)
 *
 * On successful auth, `req.serverTokenVerified = true` is set so the SSE
 * transport can bind the session as authenticated (no token needed on
 * subsequent message POSTs for that session).
 */
export function createServerTokenAuth(
  globalApiKey: string | undefined,
  registry: ServerRegistry,
): RequestHandler {
  const globalKeyHash = globalApiKey
    ? scryptSync(globalApiKey, GLOBAL_API_KEY_SALT, 32)
    : null;

  return (req, res, next) => {
    const identifier = req.params['slug'] ?? req.params['identifier'];
    if (!identifier) {
      res.status(400).json({ error: 'Missing server identifier' });
      return;
    }

    // Resolve server from registry
    const server = ENDPOINT_ID_PATTERN.test(identifier)
      ? registry.getByEndpointId(identifier)
      : registry.getBySlug(identifier);

    if (!server) {
      // Let transport handler return 404 — don't reveal existence info here
      next();
      return;
    }

    // Extract token from header or query parameter
    const header = req.headers['authorization'];
    const headerToken = typeof header === 'string' && header.startsWith('Bearer ')
      ? header.slice(7)
      : null;
    const queryToken = typeof req.query['token'] === 'string'
      ? req.query['token']
      : null;
    const token = headerToken ?? queryToken;

    // Case 1: Server has a per-server token — validate it
    if (server.tokenHash) {
      if (!token) {
        res.status(401).json({ error: 'Authorization required. Provide Bearer token for this server.' });
        return;
      }

      const storedHash = Buffer.from(server.tokenHash, 'hex');
      const providedHash = scryptSync(token, SERVER_TOKEN_SALT, storedHash.length);

      // Validate stored hash is well-formed and matches
      if (storedHash.length === 0 || providedHash.length !== storedHash.length || !timingSafeEqual(providedHash, storedHash)) {
        res.status(401).json({ error: 'Invalid access token' });
        return;
      }

      // Mark request as authenticated for session binding in SSE transport
      (req as unknown as Record<string, unknown>)['serverTokenVerified'] = true;
      next();
      return;
    }

    // Case 2: No per-server token — fall back to global MCP_API_KEY
    if (globalKeyHash) {
      if (!token) {
        res.status(401).json({ error: 'Authorization required. Provide Bearer token.' });
        return;
      }

      const tokenHash = scryptSync(token, GLOBAL_API_KEY_SALT, globalKeyHash.length);
      if (!timingSafeEqual(globalKeyHash, tokenHash)) {
        res.status(401).json({ error: 'Invalid API key' });
        return;
      }

      (req as unknown as Record<string, unknown>)['serverTokenVerified'] = true;
      next();
      return;
    }

    // Case 3: No per-server token AND no global key — reject
    res.status(401).json({
      error: 'This server requires an access token. Generate one in the dashboard.',
    });
  };
}
