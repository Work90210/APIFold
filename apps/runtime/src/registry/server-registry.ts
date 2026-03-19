import type { AuthMode } from '@apifold/types';

import type { Logger } from '../observability/logger.js';
import { metrics } from '../observability/metrics.js';

/** L0: Lightweight in-memory server metadata (~200 bytes per entry). */
export interface L0ServerMeta {
  readonly id: string;
  readonly slug: string;
  readonly userId: string;
  readonly authMode: AuthMode;
  readonly baseUrl: string;
  readonly rateLimit: number;
  readonly isActive: boolean;
}

export interface ServerRegistryDeps {
  readonly logger: Logger;
}

export class ServerRegistry {
  private readonly bySlug = new Map<string, L0ServerMeta>();
  private readonly byId = new Map<string, L0ServerMeta>();
  private readonly logger: Logger;

  constructor(deps: ServerRegistryDeps) {
    this.logger = deps.logger;
  }

  /** Bulk-load all servers (used on startup). Atomic swap to avoid race window. */
  loadAll(servers: readonly L0ServerMeta[]): void {
    // Build new maps first, then swap — no window where maps are empty
    const newBySlug = new Map<string, L0ServerMeta>();
    const newById = new Map<string, L0ServerMeta>();
    for (const server of servers) {
      newBySlug.set(server.slug, server);
      newById.set(server.id, server);
    }

    this.bySlug.clear();
    this.byId.clear();
    for (const [slug, server] of newBySlug) {
      this.bySlug.set(slug, server);
    }
    for (const [id, server] of newById) {
      this.byId.set(id, server);
    }

    this.logger.info({ count: servers.length }, 'L0 registry loaded');
    metrics.incrementCounter('registry_load_total', { tier: 'L0' });
  }

  getBySlug(slug: string): L0ServerMeta | undefined {
    const result = this.bySlug.get(slug);
    metrics.incrementCounter('registry_lookup_total', {
      tier: 'L0',
      hit: result ? 'true' : 'false',
    });
    return result;
  }

  getById(id: string): L0ServerMeta | undefined {
    return this.byId.get(id);
  }

  /** Replace or insert a single server entry. */
  upsert(server: L0ServerMeta): void {
    const existing = this.byId.get(server.id);
    if (existing && existing.slug !== server.slug) {
      this.bySlug.delete(existing.slug);
    }
    this.bySlug.set(server.slug, server);
    this.byId.set(server.id, server);
    this.logger.debug({ serverId: server.id, slug: server.slug }, 'L0 server upserted');
  }

  /** Remove a server from the registry. */
  remove(id: string): L0ServerMeta | undefined {
    const server = this.byId.get(id);
    if (server) {
      this.byId.delete(id);
      this.bySlug.delete(server.slug);
      this.logger.debug({ serverId: id, slug: server.slug }, 'L0 server removed');
    }
    return server;
  }

  getAll(): readonly L0ServerMeta[] {
    return [...this.byId.values()];
  }

  get size(): number {
    return this.byId.size;
  }
}
