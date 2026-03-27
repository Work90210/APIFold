import { createHash } from 'node:crypto';

import type { Redis } from 'ioredis';

import type { Logger } from '../observability/logger.js';
import { metrics } from '../observability/metrics.js';
import type { MCPToolResult } from '../mcp/tool-executor.js';

const CACHE_KEY_PREFIX = 'cache:';
const WRITE_METHODS = new Set(['post', 'put', 'delete', 'patch']);

export interface CacheConfig {
  readonly serverId: string;
  readonly toolName: string;
  readonly httpMethod: string;
  readonly cacheTtlSeconds: number;
  readonly userId: string;
}

export interface ResponseCacheDeps {
  readonly redis: Redis;
  readonly logger: Logger;
}

function buildCacheKey(serverId: string, toolName: string, userId: string, input: Readonly<Record<string, unknown>>): string {
  const sortedInput = JSON.stringify(input, Object.keys(input).sort());
  const hash = createHash('sha256').update(sortedInput).digest('hex').slice(0, 16);
  return `${CACHE_KEY_PREFIX}${serverId}:${userId}:${toolName}:${hash}`;
}

export async function getCachedResponse(
  deps: ResponseCacheDeps,
  config: CacheConfig,
  input: Readonly<Record<string, unknown>>,
): Promise<MCPToolResult | null> {
  if (config.cacheTtlSeconds <= 0) return null;
  if (WRITE_METHODS.has(config.httpMethod)) return null;

  const key = buildCacheKey(config.serverId, config.toolName, config.userId, input);

  try {
    const cached = await deps.redis.get(key);
    if (cached) {
      metrics.incrementCounter('cache_hits');
      deps.logger.debug({ tool: config.toolName, serverId: config.serverId }, 'Cache HIT');
      return JSON.parse(cached) as MCPToolResult;
    }
    metrics.incrementCounter('cache_misses');
    return null;
  } catch (err) {
    deps.logger.warn({ err, key }, 'Cache read failed');
    return null;
  }
}

export async function setCachedResponse(
  deps: ResponseCacheDeps,
  config: CacheConfig,
  input: Readonly<Record<string, unknown>>,
  result: MCPToolResult,
): Promise<void> {
  if (config.cacheTtlSeconds <= 0) return;
  if (result.isError) return;

  const key = buildCacheKey(config.serverId, config.toolName, config.userId, input);

  try {
    await deps.redis.set(key, JSON.stringify(result), 'EX', config.cacheTtlSeconds);
  } catch (err) {
    deps.logger.warn({ err, key }, 'Cache write failed');
  }
}

export async function invalidateServerCache(
  deps: ResponseCacheDeps,
  serverId: string,
): Promise<void> {
  const pattern = `${CACHE_KEY_PREFIX}${serverId}:*`;

  try {
    let cursor = '0';
    let totalDeleted = 0;
    do {
      const [nextCursor, batch] = await deps.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      if (batch.length > 0) {
        await deps.redis.del(...batch);
        totalDeleted += batch.length;
      }
      cursor = nextCursor;
    } while (cursor !== '0');

    if (totalDeleted > 0) {
      deps.logger.debug({ serverId, keysDeleted: totalDeleted }, 'Cache invalidated for server');
    }
  } catch (err) {
    deps.logger.warn({ err, serverId }, 'Cache invalidation failed');
  }
}

export { CACHE_KEY_PREFIX, WRITE_METHODS, buildCacheKey };
