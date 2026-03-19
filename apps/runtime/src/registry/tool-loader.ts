import type { Logger } from '../observability/logger.js';
import { metrics } from '../observability/metrics.js';

/** Represents a single MCP tool definition. */
export interface ToolDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly inputSchema: Record<string, unknown>;
}

/** L1: On-demand tool definition cache per server. */
export interface L1ToolCache {
  readonly serverId: string;
  readonly tools: ReadonlyMap<string, ToolDefinition>;
  readonly loadedAt: number;
}

export type ToolFetcher = (serverId: string) => Promise<readonly ToolDefinition[]>;

export interface ToolLoaderDeps {
  readonly logger: Logger;
  readonly fetchTools: ToolFetcher;
}

export class ToolLoader {
  private readonly cache = new Map<string, L1ToolCache>();
  private readonly pending = new Map<string, Promise<L1ToolCache>>();
  private readonly logger: Logger;
  private readonly fetchTools: ToolFetcher;

  constructor(deps: ToolLoaderDeps) {
    this.logger = deps.logger;
    this.fetchTools = deps.fetchTools;
  }

  /** Get tools for a server, loading from DB on cache miss. */
  async getTools(serverId: string): Promise<ReadonlyMap<string, ToolDefinition>> {
    const cached = this.cache.get(serverId);
    if (cached) {
      metrics.incrementCounter('registry_lookup_total', { tier: 'L1', hit: 'true' });
      return cached.tools;
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

    this.cache.set(serverId, entry);
    this.logger.info({ serverId, toolCount: toolDefs.length }, 'L1 tools loaded');
    metrics.incrementCounter('registry_load_total', { tier: 'L1' });

    return entry;
  }
}
