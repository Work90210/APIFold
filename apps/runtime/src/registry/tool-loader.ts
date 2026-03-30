import type { Logger } from '../observability/logger.js';
import { metrics } from '../observability/metrics.js';

/** Represents a single MCP tool definition. */
export interface ToolDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly inputSchema: Record<string, unknown>;
  readonly cacheTtlSeconds?: number;
  readonly httpMethod?: string;
}

/** L1: On-demand tool definition cache per server. */
export interface L1ToolCache {
  readonly serverId: string;
  readonly tools: ReadonlyMap<string, ToolDefinition>;
  readonly loadedAt: number;
}

export type ToolFetcher = (serverId: string) => Promise<readonly ToolDefinition[]>;

/** Default TTL: 10 minutes — tools are re-fetched from DB after this. */
const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;
/** Max cached servers — evicts oldest entries when exceeded. */
const DEFAULT_MAX_CACHE_SIZE = 2_000;
/** Sweep interval for expired entries. */
const CLEANUP_INTERVAL_MS = 60_000;

export interface ToolLoaderDeps {
  readonly logger: Logger;
  readonly fetchTools: ToolFetcher;
  readonly cacheTtlMs?: number;
  readonly maxCacheSize?: number;
}

export class ToolLoader {
  private readonly cache = new Map<string, L1ToolCache>();
  private readonly pending = new Map<string, Promise<L1ToolCache>>();
  private readonly logger: Logger;
  private readonly fetchTools: ToolFetcher;
  private readonly cacheTtlMs: number;
  private readonly maxCacheSize: number;
  private readonly cleanupTimer: ReturnType<typeof setInterval>;

  constructor(deps: ToolLoaderDeps) {
    this.logger = deps.logger;
    this.fetchTools = deps.fetchTools;
    this.cacheTtlMs = deps.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    this.maxCacheSize = deps.maxCacheSize ?? DEFAULT_MAX_CACHE_SIZE;

    this.cleanupTimer = setInterval(() => this.sweep(), CLEANUP_INTERVAL_MS);
    this.cleanupTimer.unref();
  }

  /** Get tools for a server, loading from DB on cache miss or expiry. */
  async getTools(serverId: string): Promise<ReadonlyMap<string, ToolDefinition>> {
    const cached = this.cache.get(serverId);
    if (cached && !this.isExpired(cached)) {
      metrics.incrementCounter('registry_lookup_total', { tier: 'L1', hit: 'true' });
      return cached.tools;
    }

    // Expired — remove stale entry
    if (cached) {
      this.cache.delete(serverId);
    }

    metrics.incrementCounter('registry_lookup_total', { tier: 'L1', hit: 'false' });

    // Coalesce concurrent requests for the same server
    const existing = this.pending.get(serverId);
    if (existing) {
      const result = await existing;
      return result.tools;
    }

    const promise = this.load(serverId);
    this.pending.set(serverId, promise);

    try {
      const entry = await promise;
      return entry.tools;
    } finally {
      this.pending.delete(serverId);
    }
  }

  /** Evict cached tools for a server. */
  evict(serverId: string): void {
    this.cache.delete(serverId);
    this.logger.debug({ serverId }, 'L1 tools evicted');
  }

  /** Evict all cached tools. */
  evictAll(): void {
    this.cache.clear();
  }

  dispose(): void {
    clearInterval(this.cleanupTimer);
  }

  private isExpired(entry: L1ToolCache): boolean {
    return Date.now() - entry.loadedAt > this.cacheTtlMs;
  }

  private async load(serverId: string): Promise<L1ToolCache> {
    this.logger.debug({ serverId }, 'L1 loading tools from DB');
    const toolDefs = await this.fetchTools(serverId);

    const toolMap = new Map<string, ToolDefinition>();
    for (const tool of toolDefs) {
      toolMap.set(tool.name, tool);
    }

    const entry: L1ToolCache = Object.freeze({
      serverId,
      tools: toolMap,
      loadedAt: Date.now(),
    });

    // Enforce max size — evict oldest entry if at capacity
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
        this.logger.debug({ evictedServerId: oldestKey }, 'L1 cache at capacity, evicted oldest entry');
      }
    }

    this.cache.set(serverId, entry);
    this.logger.info({ serverId, toolCount: toolDefs.length }, 'L1 tools loaded');
    metrics.incrementCounter('registry_load_total', { tier: 'L1' });

    return entry;
  }

  /** Periodically remove expired entries so they don't sit in memory. */
  private sweep(): void {
    let swept = 0;
    for (const [serverId, entry] of this.cache) {
      if (this.isExpired(entry)) {
        this.cache.delete(serverId);
        swept++;
      }
    }
    if (swept > 0) {
      this.logger.debug({ swept, remaining: this.cache.size }, 'L1 expired entries swept');
    }
  }
}
