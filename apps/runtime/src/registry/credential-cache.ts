import type { Logger } from '../observability/logger.js';
import { metrics } from '../observability/metrics.js';

/** L2: TTL-cached decrypted credential headers. */
export interface L2CredentialEntry {
  readonly serverId: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly expiresAt: number;
}

export type CredentialFetcher = (serverId: string) => Promise<Readonly<Record<string, string>>>;

/** Sweep interval for removing expired credentials. */
const CLEANUP_INTERVAL_MS = 60_000;

export interface CredentialCacheDeps {
  readonly logger: Logger;
  readonly fetchHeaders: CredentialFetcher;
  readonly ttlMs: number;
}

export class CredentialCache {
  private readonly cache = new Map<string, L2CredentialEntry>();
  private readonly pending = new Map<string, Promise<L2CredentialEntry>>();
  private readonly logger: Logger;
  private readonly fetchHeaders: CredentialFetcher;
  private readonly ttlMs: number;
  private readonly cleanupTimer: ReturnType<typeof setInterval>;

  constructor(deps: CredentialCacheDeps) {
    this.logger = deps.logger;
    this.fetchHeaders = deps.fetchHeaders;
    this.ttlMs = deps.ttlMs;

    this.cleanupTimer = setInterval(() => this.sweep(), CLEANUP_INTERVAL_MS);
    this.cleanupTimer.unref();
  }

  /** Get auth headers for a server, loading and caching with TTL on miss. */
  async getHeaders(serverId: string): Promise<Readonly<Record<string, string>>> {
    const cached = this.cache.get(serverId);
    if (cached && cached.expiresAt > Date.now()) {
      metrics.incrementCounter('registry_lookup_total', { tier: 'L2', hit: 'true' });
      return cached.headers;
    }

    // Expired entry — remove it
    if (cached) {
      this.cache.delete(serverId);
    }

    metrics.incrementCounter('registry_lookup_total', { tier: 'L2', hit: 'false' });

    // Coalesce concurrent requests
    const existing = this.pending.get(serverId);
    if (existing) {
      const result = await existing;
      return result.headers;
    }

    const promise = this.load(serverId);
    this.pending.set(serverId, promise);

    try {
      const entry = await promise;
      return entry.headers;
    } finally {
      this.pending.delete(serverId);
    }
  }

  /** Evict cached credentials for a server. */
  evict(serverId: string): void {
    this.cache.delete(serverId);
    this.logger.debug({ serverId }, 'L2 credentials evicted');
  }

  /** Evict all cached credentials. */
  evictAll(): void {
    this.cache.clear();
  }

  dispose(): void {
    clearInterval(this.cleanupTimer);
  }

  private async load(serverId: string): Promise<L2CredentialEntry> {
    this.logger.debug({ serverId }, 'L2 loading credentials');
    const headers = await this.fetchHeaders(serverId);

    const entry: L2CredentialEntry = Object.freeze({
      serverId,
      headers,
      expiresAt: Date.now() + this.ttlMs,
    });

    this.cache.set(serverId, entry);
    metrics.incrementCounter('registry_load_total', { tier: 'L2' });

    return entry;
  }

  /** Proactively remove all expired entries instead of waiting for access. */
  private sweep(): void {
    const now = Date.now();
    let swept = 0;
    for (const [serverId, entry] of this.cache) {
      if (entry.expiresAt <= now) {
        this.cache.delete(serverId);
        swept++;
      }
    }
    if (swept > 0) {
      this.logger.debug({ swept, remaining: this.cache.size }, 'L2 expired credentials swept');
    }
  }
}
