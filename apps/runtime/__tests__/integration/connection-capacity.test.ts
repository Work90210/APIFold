import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import { ServerRegistry } from '../../src/registry/server-registry.js';
import { ToolLoader } from '../../src/registry/tool-loader.js';
import { CredentialCache } from '../../src/registry/credential-cache.js';
import { CircuitBreaker } from '../../src/resilience/circuit-breaker.js';
import { ConnectionMonitor } from '../../src/resilience/connection-monitor.js';
import { SessionManager } from '../../src/mcp/session-manager.js';
import { ProtocolHandler } from '../../src/mcp/protocol-handler.js';
import { createApp } from '../../src/server.js';
import { createTestLogger } from '../helpers.js';

/**
 * Connection capacity stress test.
 *
 * Validates that the runtime correctly handles:
 * - Many concurrent SSE connections up to the limit
 * - Proper 503 rejection when at capacity
 * - Clean teardown of all connections
 */
describe('Connection Capacity', () => {
  let server: Server;
  let baseUrl: string;
  let upstreamServer: Server;
  let sessionManager: SessionManager;
  let toolLoader: ToolLoader;
  let credentialCache: CredentialCache;
  let circuitBreaker: CircuitBreaker;

  const logger = createTestLogger();
  const MAX_SESSIONS = 50;
  const MAX_CONNECTIONS_PER_WORKER = 50;
  const TEST_API_KEY = 'test-api-key-that-is-long-enough-for-validation-32chars';

  beforeEach(async () => {
    const upstreamApp = express();
    upstreamApp.use(express.json());
    upstreamApp.post('/tools/echo', (req, res) => {
      res.json({ echo: (req.body as Record<string, unknown>).input });
    });

    upstreamServer = await new Promise<Server>((resolve) => {
      const s = upstreamApp.listen(0, () => resolve(s));
    });
    const upstreamAddr = upstreamServer.address();
    const upstreamUrl = typeof upstreamAddr === 'object' && upstreamAddr
      ? `http://127.0.0.1:${upstreamAddr.port}`
      : 'http://127.0.0.1:0';

    const registry = new ServerRegistry({ logger });
    registry.upsert({
      id: 'srv-load',
      slug: 'load-test',
      endpointId: 'aabbccddeeff',
      userId: 'user-1',
      transport: 'sse',
      authMode: 'none',
      baseUrl: upstreamUrl,
      rateLimit: 10000,
      isActive: true,
      tokenHash: null,
      customDomain: null,
    });

    toolLoader = new ToolLoader({
      logger,
      fetchTools: async () => [{
        id: 'tool-echo',
        name: 'echo',
        description: 'Echoes input',
        inputSchema: { type: 'object', properties: { input: { type: 'string' } } },
      }],
    });
    credentialCache = new CredentialCache({
      logger,
      fetchHeaders: async () => ({}),
      ttlMs: 60_000,
    });
    circuitBreaker = new CircuitBreaker({
      config: { failureThreshold: 5, cooldownMs: 30_000, halfOpenMaxProbes: 2 },
      logger,
    });
    const connectionMonitor = new ConnectionMonitor(logger);

    sessionManager = new SessionManager({
      logger,
      connectionMonitor,
      maxSessions: MAX_SESSIONS,
      heartbeatIntervalMs: 30_000,
      idleTimeoutMs: 300_000,
    });

    const protocolHandler = new ProtocolHandler({
      logger,
      registry,
      toolLoader,
      sessionManager,
      toolExecutorDeps: {
        logger,
        circuitBreaker,
        authInjector: { credentialCache },
        timeoutMs: 10_000,
      },
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
        maxSseSessions: MAX_SESSIONS,
        sseHeartbeatIntervalMs: 30_000,
        sseIdleTimeoutMs: 300_000,
        circuitBreakerThreshold: 5,
        circuitBreakerCooldownMs: 30_000,
        upstreamTimeoutMs: 10_000,
        credentialTtlMs: 60_000,
        fallbackPollIntervalMs: 30_000,
        corsOrigins: '*',
        globalRateLimitWindowMs: 900_000,
        globalRateLimitMax: 100_000,
        drainTimeoutMs: 5_000,
        logLevel: 'silent',
        runtimeMaxWorkers: 1,
        runtimeShutdownGraceMs: 5_000,
        runtimeHealthPort: 0,
        maxConnectionsPerWorker: MAX_CONNECTIONS_PER_WORKER,
        mcpApiKey: TEST_API_KEY,
      },
      logger,
      sessionManager,
      protocolHandler,
      registry,
      redis: null,
      isReady: () => true,
      toolLoader,
      toolExecutorDeps: {
        logger,
        circuitBreaker,
        authInjector: { credentialCache },
        timeoutMs: 10_000,
      },
    });

    sessionManager.start();

    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const addr = server.address();
    if (typeof addr === 'object' && addr) {
      baseUrl = `http://127.0.0.1:${addr.port}`;
    }
  });

  afterEach(async () => {
    sessionManager.stop();
    circuitBreaker.dispose();
    toolLoader.dispose();
    credentialCache.dispose();

    await new Promise<void>((resolve) => server.close(() => resolve()));
    await new Promise<void>((resolve) => upstreamServer.close(() => resolve()));
  });

  it('accepts concurrent SSE connections up to the limit', async () => {
    const controllers: AbortController[] = [];
    const connected: Promise<void>[] = [];

    // Open MAX_SESSIONS concurrent SSE connections
    for (let i = 0; i < MAX_SESSIONS; i++) {
      const controller = new AbortController();
      controllers.push(controller);

      const promise = fetch(`${baseUrl}/mcp/load-test/sse`, {
        signal: controller.signal,
        headers: { Accept: 'text/event-stream', Authorization: `Bearer ${TEST_API_KEY}` },
      }).then((res) => {
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/event-stream');
        // Consume stream to prevent backpressure
        void res.body?.pipeTo(new WritableStream()).catch(() => {});
      });

      connected.push(promise);
    }

    // Wait for all connections to establish
    await Promise.all(connected);

    // Verify session count matches
    expect(sessionManager.size).toBe(MAX_SESSIONS);

    // Clean up all connections
    for (const controller of controllers) {
      controller.abort();
    }

    // Give time for close events to propagate
    await new Promise((resolve) => setTimeout(resolve, 100));
  }, 15_000);

  it('returns 503 when at capacity', async () => {
    const controllers: AbortController[] = [];

    // Fill up to capacity
    for (let i = 0; i < MAX_SESSIONS; i++) {
      const controller = new AbortController();
      controllers.push(controller);
      const res = await fetch(`${baseUrl}/mcp/load-test/sse`, {
        signal: controller.signal,
        headers: { Accept: 'text/event-stream', Authorization: `Bearer ${TEST_API_KEY}` },
      });
      expect(res.status).toBe(200);
      void res.body?.pipeTo(new WritableStream()).catch(() => {});
    }

    // Next connection should be rejected
    const rejected = await fetch(`${baseUrl}/mcp/load-test/sse`, {
      headers: { Accept: 'text/event-stream', Authorization: `Bearer ${TEST_API_KEY}` },
    });
    expect(rejected.status).toBe(503);

    for (const controller of controllers) {
      controller.abort();
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }, 15_000);

  it('frees capacity when clients disconnect', async () => {
    const controllers: AbortController[] = [];

    // Fill to capacity
    for (let i = 0; i < MAX_SESSIONS; i++) {
      const controller = new AbortController();
      controllers.push(controller);
      const res = await fetch(`${baseUrl}/mcp/load-test/sse`, {
        signal: controller.signal,
        headers: { Accept: 'text/event-stream', Authorization: `Bearer ${TEST_API_KEY}` },
      });
      expect(res.status).toBe(200);
      void res.body?.pipeTo(new WritableStream()).catch(() => {});
    }

    expect(sessionManager.size).toBe(MAX_SESSIONS);

    // Disconnect half the clients
    const halfCount = Math.floor(MAX_SESSIONS / 2);
    for (let i = 0; i < halfCount; i++) {
      controllers[i]!.abort();
    }

    // Wait for close events
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(sessionManager.size).toBe(MAX_SESSIONS - halfCount);

    // New connections should succeed now
    const newController = new AbortController();
    const res = await fetch(`${baseUrl}/mcp/load-test/sse`, {
      signal: newController.signal,
      headers: { Accept: 'text/event-stream', Authorization: `Bearer ${TEST_API_KEY}` },
    });
    expect(res.status).toBe(200);
    void res.body?.pipeTo(new WritableStream()).catch(() => {});

    // Cleanup
    newController.abort();
    for (let i = halfCount; i < MAX_SESSIONS; i++) {
      controllers[i]!.abort();
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }, 15_000);

  it('handles rapid connect/disconnect cycles', async () => {
    // Simulate clients rapidly connecting and disconnecting
    for (let cycle = 0; cycle < 5; cycle++) {
      const batchControllers: AbortController[] = [];

      // Connect a batch
      const batchSize = 10;
      for (let i = 0; i < batchSize; i++) {
        const controller = new AbortController();
        batchControllers.push(controller);
        const res = await fetch(`${baseUrl}/mcp/load-test/sse`, {
          signal: controller.signal,
          headers: { Accept: 'text/event-stream', Authorization: `Bearer ${TEST_API_KEY}` },
        });
        expect(res.status).toBe(200);
        void res.body?.pipeTo(new WritableStream()).catch(() => {});
      }

      // Disconnect them all
      for (const controller of batchControllers) {
        controller.abort();
      }

      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // After all cycles, sessions should be cleaned up
    // Give a bit of time for close events
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(sessionManager.size).toBe(0);
  }, 30_000);
});
