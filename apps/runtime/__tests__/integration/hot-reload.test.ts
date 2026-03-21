import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import { ServerRegistry } from '../../src/registry/server-registry.js';
import { ToolLoader } from '../../src/registry/tool-loader.js';
import { CredentialCache } from '../../src/registry/credential-cache.js';
import { SessionManager } from '../../src/mcp/session-manager.js';
import { ConnectionMonitor } from '../../src/resilience/connection-monitor.js';
import { RedisSubscriber } from '../../src/sync/redis-subscriber.js';
import type { DbClient } from '../../src/sync/postgres-loader.js';
import { createTestLogger } from '../helpers.js';

function createMockRedis(): EventEmitter & { subscribe: ReturnType<typeof vi.fn>; unsubscribe: ReturnType<typeof vi.fn> } {
  const emitter = new EventEmitter();
  return Object.assign(emitter, {
    subscribe: vi.fn().mockResolvedValue(undefined),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
  });
}

function createMockDb(rows: unknown[] = []): DbClient {
  return { query: vi.fn().mockResolvedValue({ rows }) };
}

describe('Hot Reload Integration', () => {
  const logger = createTestLogger();
  let mockRedis: ReturnType<typeof createMockRedis>;
  let registry: ServerRegistry;
  let toolLoader: ToolLoader;
  let credentialCache: CredentialCache;
  let sessionManager: SessionManager;
  let subscriber: RedisSubscriber;

  beforeEach(async () => {
    mockRedis = createMockRedis();
    registry = new ServerRegistry({ logger });
    toolLoader = new ToolLoader({
      logger,
      fetchTools: vi.fn().mockResolvedValue([]),
    });
    credentialCache = new CredentialCache({
      logger,
      fetchHeaders: vi.fn().mockResolvedValue({}),
      ttlMs: 300_000,
    });
    sessionManager = new SessionManager({
      logger,
      connectionMonitor: new ConnectionMonitor(logger),
      maxSessions: 100,
      heartbeatIntervalMs: 60_000,
      idleTimeoutMs: 300_000,
    });

    const serverRow = {
      id: 'srv-new',
      slug: 'new-server',
      user_id: 'user-1',
      transport: 'sse',
      auth_mode: 'none',
      base_url: 'https://new.example.com',
      rate_limit: 50,
      is_active: true,
    };

    const db = createMockDb([serverRow]);

    subscriber = new RedisSubscriber({
      redis: mockRedis as never,
      logger,
      registry,
      toolLoader,
      credentialCache,
      sessionManager,
      pgLoaderDeps: { db, logger, registry },
    });

    await subscriber.subscribe();
  });

  it('adds new server to registry on server:created event', async () => {
    expect(registry.getBySlug('new-server')).toBeUndefined();

    // Simulate Redis pub/sub message
    mockRedis.emit('message', 'mcp:server-events', JSON.stringify({
      type: 'server:created',
      serverId: 'srv-new',
    }));

    // Give async handler time to process
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(registry.getBySlug('new-server')).toBeDefined();
    expect(registry.getBySlug('new-server')?.baseUrl).toBe('https://new.example.com');
  });

  it('updates server in registry on server:updated event', async () => {
    // Pre-populate registry
    registry.upsert({
      id: 'srv-new',
      slug: 'new-server',
      userId: 'user-1',
      transport: 'sse',
      authMode: 'none',
      baseUrl: 'https://old.example.com',
      rateLimit: 50,
      isActive: true,
    });

    // Pre-load tools into cache
    await toolLoader.getTools('srv-new');

    mockRedis.emit('message', 'mcp:server-events', JSON.stringify({
      type: 'server:updated',
      serverId: 'srv-new',
    }));

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Registry updated with new data from DB
    expect(registry.getBySlug('new-server')?.baseUrl).toBe('https://new.example.com');
  });

  it('removes server and closes sessions on server:deleted event', async () => {
    registry.upsert({
      id: 'srv-del',
      slug: 'del-server',
      userId: 'user-1',
      transport: 'sse',
      authMode: 'none',
      baseUrl: 'https://del.example.com',
      rateLimit: 50,
      isActive: true,
    });

    const mockRes = new EventEmitter();
    Object.assign(mockRes, {
      write: vi.fn(),
      end: vi.fn(),
      writableEnded: false,
    });
    sessionManager.create('del-server', mockRes as never);

    expect(sessionManager.size).toBe(1);

    mockRedis.emit('message', 'mcp:server-events', JSON.stringify({
      type: 'server:deleted',
      serverId: 'srv-del',
      slug: 'del-server',
    }));

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(registry.getBySlug('del-server')).toBeUndefined();
    expect(sessionManager.size).toBe(0);
  });

  it('ignores malformed events', async () => {
    const sizeBefore = registry.size;

    mockRedis.emit('message', 'mcp:server-events', 'not-json');
    mockRedis.emit('message', 'mcp:server-events', JSON.stringify({ type: 'unknown' }));
    mockRedis.emit('message', 'mcp:server-events', JSON.stringify({ type: 'server:deleted' })); // missing slug

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(registry.size).toBe(sizeBefore);
  });

  it('ignores events on wrong channel', async () => {
    mockRedis.emit('message', 'other-channel', JSON.stringify({
      type: 'server:created',
      serverId: 'srv-new',
    }));

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(registry.getBySlug('new-server')).toBeUndefined();
  });
});
