import type { AuthMode, TransportType } from '@apifold/types';

import type { Logger } from '../observability/logger.js';
import { metrics } from '../observability/metrics.js';

/** L0: Lightweight in-memory server metadata (~200 bytes per entry). */
export interface L0ServerMeta {
  readonly id: string;
  readonly slug: string;
  readonly endpointId: string;
  readonly userId: string;
  readonly transport: TransportType;
  readonly authMode: AuthMode;
  readonly baseUrl: string;
  readonly rateLimit: number;
  readonly isActive: boolean;
  readonly customDomain: string | null;
}

export interface ServerRegistryDeps {
  readonly logger: Logger;
}

export class ServerRegistry {
  private bySlug = new Map<string, L0ServerMeta>();
  private byId = new Map<string, L0ServerMeta>();
  private byEndpointId = new Map<string, L0ServerMeta>();
  private byDomain = new Map<string, L0ServerMeta>();
  private readonly logger: Logger;

  constructor(deps: ServerRegistryDeps) {
    this.logger = deps.logger;
  }

  /** Bulk-load all servers (used on startup). Atomic reference swap. */
  loadAll(servers: readonly L0ServerMeta[]): void {
    const newBySlug = new Map<string, L0ServerMeta>();
    const newById = new Map<string, L0ServerMeta>();
    const newByEndpointId = new Map<string, L0ServerMeta>();
    const newByDomain = new Map<string, L0ServerMeta>();

    for (const server of servers) {
      newBySlug.set(server.slug, server);
      newById.set(server.id, server);
      newByEndpointId.set(server.endpointId, server);
      if (server.customDomain) {
        newByDomain.set(server.customDomain, server);
      }
    }

    this.bySlug = newBySlug;
    this.byId = newById;
    this.byEndpointId = newByEndpointId;
    this.byDomain = newByDomain;

    this.logger.info({ count: servers.length }, 'L0 registry loaded');
    metrics.incrementCounter('registry_load_total', { tier: 'L0' });
  }

  getBySlug(slug: string): L0ServerMeta | undefined {
    const result = this.bySlug.get(slug);
    metrics.incrementCounter('registry_lookup_total', { tier: 'L0', hit: result ? 'true' : 'false' });
    return result;
  }

  getByEndpointId(endpointId: string): L0ServerMeta | undefined {
    const result = this.byEndpointId.get(endpointId);
    metrics.incrementCounter('registry_lookup_total', { tier: 'L0', hit: result ? 'true' : 'false' });
    return result;
  }

  getByDomain(domain: string): L0ServerMeta | undefined {
    return this.byDomain.get(domain);
  }

  getById(id: string): L0ServerMeta | undefined {
    return this.byId.get(id);
  }

  upsert(server: L0ServerMeta): void {
    const existing = this.byId.get(server.id);
    if (existing) {
      this.bySlug.delete(existing.slug);
      this.byEndpointId.delete(existing.endpointId);
      if (existing.customDomain) this.byDomain.delete(existing.customDomain);
    }
    this.bySlug.set(server.slug, server);
    this.byId.set(server.id, server);
    this.byEndpointId.set(server.endpointId, server);
    if (server.customDomain) this.byDomain.set(server.customDomain, server);
    this.logger.debug({ serverId: server.id, slug: server.slug }, 'L0 server upserted');
  }

  remove(id: string): L0ServerMeta | undefined {
    const server = this.byId.get(id);
    if (server) {
      this.byId.delete(id);
      this.bySlug.delete(server.slug);
      this.byEndpointId.delete(server.endpointId);
      if (server.customDomain) this.byDomain.delete(server.customDomain);
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
