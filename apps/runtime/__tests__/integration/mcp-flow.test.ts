import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
 * Integration test: Full MCP flow
 * SSE connect → tools/list → tools/call → response
 *
 * Uses a real Express server but mocks the upstream API and DB.
 */
describe('MCP Flow Integration', () => {
  let server: Server;
  let baseUrl: string;
  let upstreamServer: Server;
  let upstreamUrl: string;

  const logger = createTestLogger();

  beforeEach(async () => {
    // Start a mock upstream API
    const upstreamApp = express();
    upstreamApp.use(express.json());
    upstreamApp.post('/tools/get-weather', (req, res) => {
      const city = (req.body as Record<string, unknown>).city;
      res.json({ temperature: 22, city, unit: 'celsius' });
    });

    upstreamServer = await new Promise<Server>((resolve) => {
      const s = upstreamApp.listen(0, () => resolve(s));
    });
    const upstreamAddr = upstreamServer.address();
    if (typeof upstreamAddr === 'object' && upstreamAddr) {
      upstreamUrl = `http://127.0.0.1:${upstreamAddr.port}`;
    }

    // Build runtime components
    const registry = new ServerRegistry({ logger });
    registry.upsert({
      id: 'srv-1',
      slug: 'weather',
      userId: 'user-1',
      transport: 'sse',
      authMode: 'none',
      baseUrl: upstreamUrl,
      rateLimit: 100,
      isActive: true,
    });

    const toolLoader = new ToolLoader({
      logger,
      fetchTools: vi.fn().mockResolvedValue([
        { id: 't1', name: 'get-weather', description: 'Get weather', inputSchema: { type: 'object' } },
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
      },
      logger,
      sessionManager,
      protocolHandler,
      registry,
      redis: null,
      isReady: () => true,
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

  it('health endpoint returns ok', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('readiness endpoint returns ready', async () => {
    const res = await fetch(`${baseUrl}/health/ready`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ready');
  });

  it('returns 404 for unknown server slug', async () => {
    const res = await fetch(`${baseUrl}/mcp/nonexistent/sse`);
    expect(res.status).toBe(404);
  });

  it('full SSE flow: connect → tools/list → tools/call', async () => {
    // 1. Establish SSE connection
    const sseRes = await fetch(`${baseUrl}/mcp/weather/sse`);
    expect(sseRes.status).toBe(200);
    expect(sseRes.headers.get('content-type')).toBe('text/event-stream');

    // Read the endpoint event to get session ID
    const reader = sseRes.body!.getReader();
    const decoder = new TextDecoder();

    let buffer = '';
    let sessionId = '';

    // Read until we get the endpoint event
    for (let i = 0; i < 10; i++) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const endpointMatch = buffer.match(/event: endpoint\ndata: (.+)\n/);
      if (endpointMatch) {
        const data = JSON.parse(endpointMatch[1]!);
        sessionId = data.sessionId;
        break;
      }
    }

    expect(sessionId).toBeTruthy();

    // 2. Send initialize
    const initRes = await fetch(`${baseUrl}/mcp/weather/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }),
    });
    expect(initRes.status).toBe(202);

    // 3. Send tools/list
    const listRes = await fetch(`${baseUrl}/mcp/weather/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
    });
    expect(listRes.status).toBe(202);

    // 4. Send tools/call
    const callRes = await fetch(`${baseUrl}/mcp/weather/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'get-weather', arguments: { city: 'Tokyo' } },
      }),
    });
    expect(callRes.status).toBe(202);

    // 5. Read SSE events — collect all JSON-RPC responses
    // Give it a moment for the events to arrive
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Read remaining buffer
    for (let i = 0; i < 20; i++) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Check if we have all 3 responses
      const messageMatches = buffer.match(/event: message\ndata: .+\n/g);
      if (messageMatches && messageMatches.length >= 3) break;
    }

    // Parse all message events
    const messages = [...buffer.matchAll(/event: message\ndata: (.+)\n/g)]
      .map(([, data]) => JSON.parse(data!));

    // Verify initialize response
    const initResponse = messages.find((m) => m.id === 1);
    expect(initResponse?.result?.protocolVersion).toBe('2024-11-05');

    // Verify tools/list response
    const listResponse = messages.find((m) => m.id === 2);
    expect(listResponse?.result?.tools).toHaveLength(1);
    expect(listResponse?.result?.tools[0].name).toBe('get-weather');

    // Verify tools/call response (proxied through to upstream)
    const callResponse = messages.find((m) => m.id === 3);
    expect(callResponse?.result?.isError).toBe(false);
    const toolResult = JSON.parse(callResponse?.result?.content[0]?.text);
    expect(toolResult.city).toBe('Tokyo');
    expect(toolResult.temperature).toBe(22);

    // Cleanup
    reader.cancel();
  });

  it('rejects cross-server session hijacking', async () => {
    // Connect to weather server
    const sseRes = await fetch(`${baseUrl}/mcp/weather/sse`);
    const reader = sseRes.body!.getReader();
    const decoder = new TextDecoder();

    let buffer = '';
    let sessionId = '';
    for (let i = 0; i < 10; i++) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const match = buffer.match(/event: endpoint\ndata: (.+)\n/);
      if (match) {
        sessionId = JSON.parse(match[1]!).sessionId;
        break;
      }
    }

    // Try to use that session on a different slug
    const res = await fetch(`${baseUrl}/mcp/other-server/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
    });
    expect(res.status).toBe(403);

    reader.cancel();
  });

  it('rejects invalid JSON-RPC version', async () => {
    // First get a session
    const sseRes = await fetch(`${baseUrl}/mcp/weather/sse`);
    const reader = sseRes.body!.getReader();
    const decoder = new TextDecoder();

    let buffer = '';
    let sessionId = '';
    for (let i = 0; i < 10; i++) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const match = buffer.match(/event: endpoint\ndata: (.+)\n/);
      if (match) {
        sessionId = JSON.parse(match[1]!).sessionId;
        break;
      }
    }

    // Send with wrong jsonrpc version
    const res = await fetch(`${baseUrl}/mcp/weather/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
      body: JSON.stringify({ jsonrpc: '1.0', id: 1, method: 'ping' }),
    });
    expect(res.status).toBe(400);

    reader.cancel();
  });

  it('rejects /internal/sync without service secret', async () => {
    const res = await fetch(`${baseUrl}/internal/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects /internal/sync with wrong service secret', async () => {
    const res = await fetch(`${baseUrl}/internal/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Runtime-Secret': 'wrong-secret-that-is-long-enough-32chars!',
      },
      body: JSON.stringify({ test: true }),
    });
    expect(res.status).toBe(401);
  });

  it('accepts /internal/sync with correct service secret', async () => {
    const res = await fetch(`${baseUrl}/internal/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Runtime-Secret': 'c'.repeat(32),
      },
      body: JSON.stringify({ test: true }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
