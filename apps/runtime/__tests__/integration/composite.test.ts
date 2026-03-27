import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import { EventEmitter } from 'events';
import { ServerRegistry } from '../../src/registry/server-registry.js';
import { ToolLoader } from '../../src/registry/tool-loader.js';
import { CredentialCache } from '../../src/registry/credential-cache.js';
import { CircuitBreaker } from '../../src/resilience/circuit-breaker.js';
import { createCompositeRouter } from '../../src/transports/composite.js';
import type { CompositeRegistry, CompositeServerMeta } from '../../src/transports/composite.js';
import { createTestLogger } from '../helpers.js';

function createMockRedis() {
  const emitter = new EventEmitter();
  return Object.assign(emitter, {
    get: vi.fn().mockResolvedValue(null),
    eval: vi.fn().mockResolvedValue([1, 1, 1000]),
    status: 'ready' as const,
  });
}

describe('Composite Dispatch Integration', () => {
  let server: Server;
  let baseUrl: string;
  let upstreamServerA: Server;
  let upstreamServerB: Server;

  const logger = createTestLogger();

  beforeEach(async () => {
    // Two mock upstreams
    const appA = express();
    appA.use(express.json());
    appA.post('/tools/list-charges', (req, res) => {
      res.json({ charges: [{ id: 'ch_1', amount: 2000 }] });
    });

    const appB = express();
    appB.use(express.json());
    appB.post('/tools/list-repos', (req, res) => {
      res.json({ repos: [{ name: 'my-repo', stars: 42 }] });
    });

    upstreamServerA = await new Promise<Server>((resolve) => {
      const s = appA.listen(0, () => resolve(s));
    });
    upstreamServerB = await new Promise<Server>((resolve) => {
      const s = appB.listen(0, () => resolve(s));
    });

    const addrA = upstreamServerA.address();
    const addrB = upstreamServerB.address();
    const urlA = typeof addrA === 'object' && addrA ? `http://127.0.0.1:${addrA.port}` : '';
    const urlB = typeof addrB === 'object' && addrB ? `http://127.0.0.1:${addrB.port}` : '';

    const registry = new ServerRegistry({ logger });
    registry.upsert({
      id: 'srv-stripe',
      slug: 'stripe',
      endpointId: 'aaa000000001',
      userId: 'user-1',
      transport: 'streamable-http',
      authMode: 'none',
      baseUrl: urlA,
      rateLimit: 100,
      isActive: true,
      tokenHash: null,
      customDomain: null,
    });
    registry.upsert({
      id: 'srv-github',
      slug: 'github',
      endpointId: 'bbb000000002',
      userId: 'user-1',
      transport: 'streamable-http',
      authMode: 'none',
      baseUrl: urlB,
      rateLimit: 100,
      isActive: true,
      tokenHash: null,
      customDomain: null,
    });

    const toolLoader = new ToolLoader({
      logger,
      fetchTools: vi.fn().mockImplementation((serverId: string) => {
        if (serverId === 'srv-stripe') {
          return Promise.resolve([
            { id: 't1', name: 'list-charges', description: 'List Stripe charges', inputSchema: { type: 'object' } },
          ]);
        }
        if (serverId === 'srv-github') {
          return Promise.resolve([
            { id: 't2', name: 'list-repos', description: 'List GitHub repos', inputSchema: { type: 'object' } },
          ]);
        }
        return Promise.resolve([]);
      }),
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

    const mockRedis = createMockRedis();

    const compositeRegistry: CompositeRegistry = {
      getBySlug(slug: string): CompositeServerMeta | undefined {
        if (slug === 'all-apis') {
          return {
            id: 'comp-1',
            slug: 'all-apis',
            endpointId: 'ccc000000003',
            userId: 'user-1',
            isActive: true,
            tokenHash: null,
            members: [
              { serverId: 'srv-stripe', namespace: 'stripe' },
              { serverId: 'srv-github', namespace: 'github' },
            ],
          };
        }
        return undefined;
      },
      getByEndpointId(): CompositeServerMeta | undefined {
        return undefined;
      },
    };

    const app = express();
    app.use(express.json());

    // Skip auth for tests
    app.use((req, _res, next) => {
      (req as unknown as Record<string, unknown>)['serverTokenVerified'] = true;
      next();
    });

    app.use(createCompositeRouter({
      logger,
      registry,
      compositeRegistry,
      toolLoader,
      toolExecutorDeps: {
        logger,
        circuitBreaker,
        authInjector: { credentialCache },
        timeoutMs: 5000,
        allowPrivateUpstreams: true,
      },
      redis: mockRedis as never,
    }));

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
    await new Promise<void>((resolve) => upstreamServerA.close(() => resolve()));
    await new Promise<void>((resolve) => upstreamServerB.close(() => resolve()));
  });

  it('returns 404 for unknown composite', async () => {
    const res = await fetch(`${baseUrl}/mcp/composite/nonexistent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }),
    });
    expect(res.status).toBe(404);
  });

  it('handles initialize', async () => {
    const res = await fetch(`${baseUrl}/mcp/composite/all-apis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.serverInfo.name).toBe('apifold-composite');
    expect(body.result.capabilities.tools).toBeDefined();
  });

  it('lists namespaced tools from all members', async () => {
    const res = await fetch(`${baseUrl}/mcp/composite/all-apis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    const tools = body.result.tools;
    expect(tools).toHaveLength(2);
    expect(tools.map((t: { name: string }) => t.name).sort()).toEqual([
      'github__list-repos',
      'stripe__list-charges',
    ]);
    expect(tools[0].description).toMatch(/^\[/); // Namespace prefix in description
  });

  it('dispatches namespaced tool call to correct upstream', async () => {
    const res = await fetch(`${baseUrl}/mcp/composite/all-apis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'stripe__list-charges', arguments: {} },
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.isError).toBe(false);
    const content = JSON.parse(body.result.content[0].text);
    expect(content.charges).toBeDefined();
    expect(content.charges[0].id).toBe('ch_1');
  });

  it('dispatches to second namespace correctly', async () => {
    const res = await fetch(`${baseUrl}/mcp/composite/all-apis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: { name: 'github__list-repos', arguments: {} },
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.isError).toBe(false);
    const content = JSON.parse(body.result.content[0].text);
    expect(content.repos).toBeDefined();
    expect(content.repos[0].name).toBe('my-repo');
  });

  it('rejects non-namespaced tool call', async () => {
    const res = await fetch(`${baseUrl}/mcp/composite/all-apis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: { name: 'list-charges', arguments: {} },
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe(-32602);
  });

  it('rejects unknown namespace', async () => {
    const res = await fetch(`${baseUrl}/mcp/composite/all-apis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: { name: 'unknown__list-charges', arguments: {} },
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe(-32002);
  });

  it('handles ping', async () => {
    const res = await fetch(`${baseUrl}/mcp/composite/all-apis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'ping' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.pong).toBe(true);
  });
});
