import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import { EventEmitter } from 'events';
import { ServerRegistry } from '../../src/registry/server-registry.js';
import { ToolLoader } from '../../src/registry/tool-loader.js';
import { CredentialCache } from '../../src/registry/credential-cache.js';
import { CircuitBreaker } from '../../src/resilience/circuit-breaker.js';
import { ConnectionMonitor } from '../../src/resilience/connection-monitor.js';
import { SessionManager } from '../../src/mcp/session-manager.js';
import { ProtocolHandler } from '../../src/mcp/protocol-handler.js';
import { createApp } from '../../src/server.js';
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
    keys: vi.fn().mockImplementation((pattern: string) => {
      const prefix = pattern.replace(/\*$/, '');
      const matched = [...store.keys()].filter((k) => k.startsWith(prefix));
      return Promise.resolve(matched);
    }),
    scan: vi.fn().mockImplementation((_cursor: string, _match: string, pattern: string) => {
      const prefix = pattern.replace(/\*$/, '');
      const matched = [...store.keys()].filter((k) => k.startsWith(prefix));
      return Promise.resolve(['0', matched]);
    }),
    eval: vi.fn().mockResolvedValue([1, 1, 1000]),
    status: 'ready' as const,
    _store: store,
  });
}

describe('Streamable HTTP Integration', () => {
  let server: Server;
  let baseUrl: string;
  let upstreamServer: Server;
  let mockRedis: ReturnType<typeof createMockRedis>;

  const logger = createTestLogger();
  const TEST_API_KEY = 'test-api-key-that-is-long-enough-for-validation-32chars';

  beforeEach(async () => {
    // Mock upstream that delays 100ms to simulate a "long-running" call
    const upstreamApp = express();
    upstreamApp.use(express.json());
    upstreamApp.post('/tools/slow-tool', async (req, res) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      res.json({ result: 'done', input: req.body });
    });
    upstreamApp.post('/tools/fast-tool', (req, res) => {
      res.json({ result: 'fast', input: req.body });
    });

    upstreamServer = await new Promise<Server>((resolve) => {
      const s = upstreamApp.listen(0, () => resolve(s));
    });
    const upstreamAddr = upstreamServer.address();
    const upstreamUrl = typeof upstreamAddr === 'object' && upstreamAddr
      ? `http://127.0.0.1:${upstreamAddr.port}`
      : '';

    const registry = new ServerRegistry({ logger });
    registry.upsert({
      id: 'srv-http',
      slug: 'http-server',
      endpointId: 'abcdef012345',
      userId: 'user-1',
      transport: 'streamable-http',
      authMode: 'none',
      baseUrl: upstreamUrl,
      rateLimit: 100,
      isActive: true,
      tokenHash: null,
      customDomain: null,
    });

    const toolLoader = new ToolLoader({
      logger,
      fetchTools: vi.fn().mockResolvedValue([
        { id: 't1', name: 'slow-tool', description: 'Slow tool', inputSchema: { type: 'object' } },
        { id: 't2', name: 'fast-tool', description: 'Fast tool', inputSchema: { type: 'object' } },
      ]),
    });

    const credentialCache = new CredentialCache({
      logger,
      fetchHeaders: vi.fn().mockResolvedValue({}),
      ttlMs: 300_000,
    });

    const circuitBreaker = new CircuitBreaker({
      config: { failureThreshold: 5, cooldownMs: 30_000, halfOpenMaxProbes: 2 },
      logger,
    });

    const connectionMonitor = new ConnectionMonitor(logger);
    const sessionManager = new SessionManager({
      logger,
      connectionMonitor,
      maxSessions: 100,
      heartbeatIntervalMs: 60_000,
      idleTimeoutMs: 300_000,
    });

    mockRedis = createMockRedis();

    const protocolHandler = new ProtocolHandler({
      logger,
      registry,
      toolLoader,
      sessionManager,
      toolExecutorDeps: {
        logger,
        circuitBreaker,
        authInjector: { credentialCache },
        timeoutMs: 5000,
        allowPrivateUpstreams: true,
      },
      redis: mockRedis as never,
    });

    const app = createApp({
      config: {
        port: 0,
        nodeEnv: 'test',
        databaseUrl: 'postgresql://test:test@localhost/test',
        databasePoolMax: 1,
        redisUrl: 'redis://localhost:6379',
        vaultSecret: 'a'.repeat(32),
        vaultSalt: 'b'.repeat(32),
        runtimeSecret: 'c'.repeat(32),
        maxSseSessions: 100,
        sseHeartbeatIntervalMs: 60_000,
        sseIdleTimeoutMs: 300_000,
        circuitBreakerThreshold: 5,
        circuitBreakerCooldownMs: 30_000,
        upstreamTimeoutMs: 5000,
        credentialTtlMs: 300_000,
        fallbackPollIntervalMs: 30_000,
        corsOrigins: '*',
        globalRateLimitWindowMs: 900_000,
        globalRateLimitMax: 1000,
        drainTimeoutMs: 5000,
        logLevel: 'silent',
        runtimeMaxWorkers: 2,
        runtimeShutdownGraceMs: 10_000,
        runtimeHealthPort: 0,
        maxConnectionsPerWorker: 100,
        mcpApiKey: TEST_API_KEY,
      },
      logger,
      sessionManager,
      protocolHandler,
      registry,
      redis: mockRedis as never,
      isReady: () => true,
      toolLoader,
      toolExecutorDeps: {
        logger,
        circuitBreaker,
        authInjector: { credentialCache },
        timeoutMs: 5000,
        allowPrivateUpstreams: true,
      },
    });

    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const addr = server.address();
    if (typeof addr === 'object' && addr) {
      baseUrl = `http://127.0.0.1:${addr.port}`;
    }
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await new Promise<void>((resolve) => upstreamServer.close(() => resolve()));
  });

  it('returns JSON response for standard tool call', async () => {
    // Initialize session
    const initRes = await fetch(`${baseUrl}/mcp/http-server`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TEST_API_KEY}`,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }),
    });
    expect(initRes.status).toBe(200);
    const initBody = await initRes.json();
    const sessionId = initRes.headers.get('mcp-session-id');
    expect(sessionId).toBeTruthy();
    expect(initBody.result.capabilities.resources).toBeDefined();

    // Call tool without Accept: text/event-stream → JSON response
    const callRes = await fetch(`${baseUrl}/mcp/http-server`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Mcp-Session-Id': sessionId!,
        Authorization: `Bearer ${TEST_API_KEY}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'fast-tool', arguments: { key: 'value' } },
      }),
    });
    expect(callRes.status).toBe(200);
    expect(callRes.headers.get('content-type')).toContain('application/json');
    const callBody = await callRes.json();
    expect(callBody.result.isError).toBe(false);
  });

  it('returns SSE stream when Accept: text/event-stream for tool call', async () => {
    // Initialize
    const initRes = await fetch(`${baseUrl}/mcp/http-server`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TEST_API_KEY}`,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }),
    });
    const sessionId = initRes.headers.get('mcp-session-id')!;

    // Call tool with Accept: text/event-stream → SSE response
    const callRes = await fetch(`${baseUrl}/mcp/http-server`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        'Mcp-Session-Id': sessionId,
        Authorization: `Bearer ${TEST_API_KEY}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'slow-tool', arguments: { data: 'test' } },
      }),
    });
    expect(callRes.status).toBe(200);
    expect(callRes.headers.get('content-type')).toBe('text/event-stream');

    const body = await callRes.text();
    expect(body).toContain('event: progress');
    expect(body).toContain('event: message');
    expect(body).toContain('"result"');
  });

  it('handles resources/list and resources/read', async () => {
    // Initialize
    const initRes = await fetch(`${baseUrl}/mcp/http-server`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TEST_API_KEY}`,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }),
    });
    const sessionId = initRes.headers.get('mcp-session-id')!;

    // Seed a webhook resource in Redis
    mockRedis._store.set(
      'webhook:latest:srv-http:payment.completed',
      JSON.stringify({ amount: 1000, currency: 'usd' }),
    );

    // resources/list
    const listRes = await fetch(`${baseUrl}/mcp/http-server`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Mcp-Session-Id': sessionId,
        Authorization: `Bearer ${TEST_API_KEY}`,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'resources/list' }),
    });
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    expect(listBody.result.resources).toHaveLength(1);
    expect(listBody.result.resources[0].uri).toBe('webhook://http-server/payment.completed');

    // resources/read
    const readRes = await fetch(`${baseUrl}/mcp/http-server`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Mcp-Session-Id': sessionId,
        Authorization: `Bearer ${TEST_API_KEY}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'resources/read',
        params: { uri: 'webhook://http-server/payment.completed' },
      }),
    });
    expect(readRes.status).toBe(200);
    const readBody = await readRes.json();
    expect(readBody.result.contents).toHaveLength(1);
    const content = JSON.parse(readBody.result.contents[0].text);
    expect(content.amount).toBe(1000);
  });

  it('webhook receiver stores event and returns 200', async () => {
    const webhookRes = await fetch(`${baseUrl}/webhooks/http-server/order.created`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: 'ord-123', total: 49.99 }),
    });
    expect(webhookRes.status).toBe(200);
    const webhookBody = await webhookRes.json();
    expect(webhookBody.ok).toBe(true);

    // Verify Redis was updated
    expect(mockRedis.set).toHaveBeenCalledWith(
      'webhook:latest:srv-http:order.created',
      expect.any(String),
      'EX',
      86400,
    );
  });

  it('webhook receiver returns 404 for unknown server', async () => {
    const res = await fetch(`${baseUrl}/webhooks/nonexistent/some.event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: 'test' }),
    });
    expect(res.status).toBe(404);
  });

  it('webhook receiver rejects invalid event name', async () => {
    const res = await fetch(`${baseUrl}/webhooks/http-server/invalid event!`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: 'test' }),
    });
    expect(res.status).toBe(400);
  });
});
