import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import {
  getCachedResponse,
  setCachedResponse,
  invalidateServerCache,
  buildCacheKey,
  WRITE_METHODS,
} from '../../src/middleware/response-cache.js';
import { createTestLogger } from '../helpers.js';

function createMockRedis() {
  const store = new Map<string, string>();
  const emitter = new EventEmitter();
  return Object.assign(emitter, {
    get: vi.fn().mockImplementation((key: string) => Promise.resolve(store.get(key) ?? null)),
    set: vi.fn().mockImplementation((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve('OK');
    }),
    del: vi.fn().mockImplementation((...keys: string[]) => {
      let deleted = 0;
      for (const key of keys) {
        if (store.delete(key)) deleted++;
      }
      return Promise.resolve(deleted);
    }),
    scan: vi.fn().mockImplementation((_cursor: string, _match: string, pattern: string) => {
      const prefix = pattern.replace(/\*$/, '');
      const matched = [...store.keys()].filter((k) => k.startsWith(prefix));
      return Promise.resolve(['0', matched]);
    }),
    status: 'ready' as const,
    _store: store,
  });
}

describe('Response Cache', () => {
  const logger = createTestLogger();
  let redis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    redis = createMockRedis();
  });

  describe('buildCacheKey', () => {
    it('produces deterministic keys for the same input', () => {
      const key1 = buildCacheKey('srv-1', 'get-user', 'u1', { id: '123', name: 'test' });
      const key2 = buildCacheKey('srv-1', 'get-user', 'u1', { name: 'test', id: '123' });
      expect(key1).toBe(key2);
    });

    it('produces different keys for different inputs', () => {
      const key1 = buildCacheKey('srv-1', 'get-user', 'u1', { id: '123' });
      const key2 = buildCacheKey('srv-1', 'get-user', 'u1', { id: '456' });
      expect(key1).not.toBe(key2);
    });

    it('produces different keys for different users', () => {
      const key1 = buildCacheKey('srv-1', 'get-user', 'u1', { id: '123' });
      const key2 = buildCacheKey('srv-1', 'get-user', 'u2', { id: '123' });
      expect(key1).not.toBe(key2);
    });

    it('includes server, user, and tool in key', () => {
      const key = buildCacheKey('srv-1', 'get-user', 'u1', {});
      expect(key).toContain('srv-1');
      expect(key).toContain('u1');
      expect(key).toContain('get-user');
    });
  });

  describe('getCachedResponse', () => {
    const deps = () => ({ redis: redis as never, logger });

    it('returns null when TTL is 0', async () => {
      const result = await getCachedResponse(deps(), {
        serverId: 'srv-1', toolName: 'tool', httpMethod: 'get', cacheTtlSeconds: 0, userId: 'u1',
      }, {});
      expect(result).toBeNull();
    });

    it('returns null for write methods', async () => {
      for (const method of WRITE_METHODS) {
        const result = await getCachedResponse(deps(), {
          serverId: 'srv-1', toolName: 'tool', httpMethod: method, cacheTtlSeconds: 60, userId: 'u1',
        }, {});
        expect(result).toBeNull();
      }
    });

    it('returns null on cache miss', async () => {
      const result = await getCachedResponse(deps(), {
        serverId: 'srv-1', toolName: 'get-user', httpMethod: 'get', cacheTtlSeconds: 60, userId: 'u1',
      }, { id: '123' });
      expect(result).toBeNull();
    });

    it('returns cached result on hit', async () => {
      const toolResult = { content: [{ type: 'text', text: '{"name":"test"}' }], isError: false };
      const config = { serverId: 'srv-1', toolName: 'get-user', httpMethod: 'get', cacheTtlSeconds: 60, userId: 'u1' };
      const input = { id: '123' };

      await setCachedResponse(deps(), config, input, toolResult);
      const result = await getCachedResponse(deps(), config, input);

      expect(result).toEqual(toolResult);
    });
  });

  describe('setCachedResponse', () => {
    const deps = () => ({ redis: redis as never, logger });

    it('does not cache errors', async () => {
      const config = { serverId: 'srv-1', toolName: 'get-user', httpMethod: 'get', cacheTtlSeconds: 60, userId: 'u1' };
      await setCachedResponse(deps(), config, {}, { content: [{ type: 'text', text: 'err' }], isError: true });
      expect(redis._store.size).toBe(0);
    });

    it('stores with correct TTL', async () => {
      const config = { serverId: 'srv-1', toolName: 'get-user', httpMethod: 'get', cacheTtlSeconds: 120, userId: 'u1' };
      await setCachedResponse(deps(), config, {}, { content: [{ type: 'text', text: 'ok' }], isError: false });
      expect(redis.set).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'EX', 120);
    });
  });

  describe('invalidateServerCache', () => {
    const deps = () => ({ redis: redis as never, logger });

    it('deletes all keys matching server pattern', async () => {
      redis._store.set('cache:srv-1:tool-a:abc123', '{}');
      redis._store.set('cache:srv-1:tool-b:def456', '{}');
      redis._store.set('cache:srv-2:tool-a:ghi789', '{}');

      await invalidateServerCache(deps(), 'srv-1');

      expect(redis.del).toHaveBeenCalledWith('cache:srv-1:tool-a:abc123', 'cache:srv-1:tool-b:def456');
    });

    it('does nothing when no keys match', async () => {
      await invalidateServerCache(deps(), 'srv-nonexistent');
      expect(redis.del).not.toHaveBeenCalled();
    });
  });
});
