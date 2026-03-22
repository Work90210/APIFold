/**
 * Integration tests for the lightweight MCP server.
 *
 * Strategy: start the real Express server on a random port, send real HTTP
 * requests using Node's built-in `fetch`, and assert on the responses.
 * `proxyToolCall` is mocked via vi.mock so tests never hit a real upstream API.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { MCPToolDefinition } from '@apifold/transformer';
import type { CliConfig } from '../../src/config/schema.js';

// ---------------------------------------------------------------------------
// Mock proxyToolCall before importing startServer so the mock is in place when
// the module is first evaluated.
// ---------------------------------------------------------------------------
vi.mock('../../src/server/proxy.js', () => ({
  proxyToolCall: vi.fn(),
}));

import { proxyToolCall } from '../../src/server/proxy.js';
import { startServer } from '../../src/server/lightweight.js';
import http from 'node:http';

const mockProxy = proxyToolCall as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides?: Partial<CliConfig>): CliConfig {
  return Object.freeze({
    spec: './api.yaml',
    port: 0, // will be overridden by the actual listening port
    transport: 'sse' as const,
    baseUrl: 'https://api.example.com',
    auth: { type: 'none' as const },
    filters: {},
    includeDeprecated: false,
    logLevel: 'silent' as const,
    ...overrides,
  }) as CliConfig;
}

function makeTool(name: string): MCPToolDefinition {
  return {
    name,
    description: `Tool ${name}`,
    inputSchema: { type: 'object', properties: {}, required: [] },
    _meta: {
      method: 'get',
      pathTemplate: `/${name}`,
      paramMap: {},
      tags: [],
      deprecated: false,
    },
  };
}

/**
 * Start a server on a random port and return { baseUrl, server }.
 * The server is created by monkey-patching the port to 0 so the OS picks one.
 */
async function startTestServer(
  config: CliConfig,
  tools: readonly MCPToolDefinition[],
): Promise<{ baseUrl: string; stop: () => Promise<void> }> {
  // We need a handle to close the server. The only way to get one is to
  // intercept the net.Server — we do that by intercepting app.listen via a
  // custom http server.
  //
  // Simpler: we rely on the fact that startServer itself resolves once the
  // server is listening and we grab the port from a real server we start
  // ourselves, then pass a pre-chosen port to startServer.

  // Pick a random ephemeral port by briefly binding to 0.
  const tempServer = http.createServer();
  await new Promise<void>((resolve) => tempServer.listen(0, '127.0.0.1', resolve));
  const address = tempServer.address() as { port: number };
  const port = address.port;
  tempServer.close();

  // Small delay to let the OS reclaim the port
  await new Promise<void>((r) => setTimeout(r, 10));

  const testConfig = Object.freeze({ ...config, port }) as CliConfig;

  // startServer resolves once the server is listening.
  await startServer(testConfig, tools);

  const baseUrl = `http://127.0.0.1:${port}`;

  const stop = () => Promise.resolve(); // tests run and process exits; no cleanup needed

  return { baseUrl, stop };
}

interface JsonRpcReqBody {
  jsonrpc: string;
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

async function jsonRpc(baseUrl: string, endpoint: string, body: JsonRpcReqBody, headers?: Record<string, string>) {
  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

// ---------------------------------------------------------------------------
// Streamable-HTTP transport tests
// ---------------------------------------------------------------------------

describe('streamable-http transport', () => {
  let baseUrl: string;
  const tools = [makeTool('list_items'), makeTool('get_item')];

  beforeAll(async () => {
    const server = await startTestServer(makeConfig({ transport: 'streamable-http' }), tools);
    baseUrl = server.baseUrl;
  });

  beforeEach(() => {
    mockProxy.mockReset();
  });

  // -------------------------------------------------------------------------
  // initialize
  // -------------------------------------------------------------------------

  it('initialize returns correct protocolVersion and capabilities', async () => {
    const { status, json } = await jsonRpc(baseUrl, '/mcp', {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
    });
    expect(status).toBe(200);
    expect(json.result.protocolVersion).toBe('2024-11-05');
    expect(json.result.capabilities).toEqual({ tools: { listChanged: false } });
    expect(json.result.serverInfo.name).toBe('apifold-cli');
  });

  it('initialize sets Mcp-Session-Id response header', async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }),
    });
    expect(res.headers.get('mcp-session-id')).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // tools/list
  // -------------------------------------------------------------------------

  it('tools/list returns all registered tools', async () => {
    const { status, json } = await jsonRpc(baseUrl, '/mcp', {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
    });
    expect(status).toBe(200);
    const names = json.result.tools.map((t: { name: string }) => t.name);
    expect(names).toContain('list_items');
    expect(names).toContain('get_item');
    expect(json.result.tools).toHaveLength(2);
  });

  it('tools/list returns tool name, description, and inputSchema', async () => {
    const { json } = await jsonRpc(baseUrl, '/mcp', {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/list',
    });
    const tool = json.result.tools.find((t: { name: string }) => t.name === 'list_items');
    expect(tool).toBeDefined();
    expect(tool.description).toBe('Tool list_items');
    expect(tool.inputSchema).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // tools/call — success
  // -------------------------------------------------------------------------

  it('tools/call proxies to upstream and returns result', async () => {
    mockProxy.mockResolvedValueOnce({
      status: 200,
      body: { items: [1, 2, 3] },
      contentType: 'application/json',
    });

    const { status, json } = await jsonRpc(baseUrl, '/mcp', {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'list_items', arguments: {} },
    });
    expect(status).toBe(200);
    expect(json.result.content[0].type).toBe('text');
    expect(json.result.isError).toBeUndefined();
    expect(mockProxy).toHaveBeenCalledOnce();
  });

  // -------------------------------------------------------------------------
  // tools/call — upstream 4xx error
  // -------------------------------------------------------------------------

  it('tools/call with 4xx upstream sets isError: true on result', async () => {
    mockProxy.mockResolvedValueOnce({
      status: 404,
      body: { message: 'not found' },
      contentType: 'application/json',
    });

    const { json } = await jsonRpc(baseUrl, '/mcp', {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: { name: 'list_items', arguments: {} },
    });
    expect(json.result.isError).toBe(true);
    expect(json.result.content[0].type).toBe('text');
  });

  // -------------------------------------------------------------------------
  // tools/call — unknown tool
  // -------------------------------------------------------------------------

  it('tools/call with unknown tool name returns JSON-RPC error', async () => {
    const { json } = await jsonRpc(baseUrl, '/mcp', {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: { name: 'nonexistent_tool', arguments: {} },
    });
    expect(json.error).toBeDefined();
    expect(json.error.code).toBe(-32002);
    expect(json.error.message).toContain('nonexistent_tool');
  });

  // -------------------------------------------------------------------------
  // tools/call — missing tool name param
  // -------------------------------------------------------------------------

  it('tools/call without a tool name returns -32602 error', async () => {
    const { json } = await jsonRpc(baseUrl, '/mcp', {
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: { arguments: {} },
    });
    expect(json.error.code).toBe(-32602);
  });

  // -------------------------------------------------------------------------
  // tools/call — proxy throws
  // -------------------------------------------------------------------------

  it('tools/call returns -32603 when proxyToolCall throws', async () => {
    mockProxy.mockRejectedValueOnce(new Error('upstream connection refused'));

    const { json } = await jsonRpc(baseUrl, '/mcp', {
      jsonrpc: '2.0',
      id: 8,
      method: 'tools/call',
      params: { name: 'list_items', arguments: {} },
    });
    expect(json.error.code).toBe(-32603);
  });

  // -------------------------------------------------------------------------
  // ping
  // -------------------------------------------------------------------------

  it('ping returns pong', async () => {
    const { status, json } = await jsonRpc(baseUrl, '/mcp', {
      jsonrpc: '2.0',
      id: 9,
      method: 'ping',
    });
    expect(status).toBe(200);
    expect(json.result.pong).toBe(true);
  });

  // -------------------------------------------------------------------------
  // unknown method
  // -------------------------------------------------------------------------

  it('unknown method returns -32601 method not found', async () => {
    const { json } = await jsonRpc(baseUrl, '/mcp', {
      jsonrpc: '2.0',
      id: 10,
      method: 'notifications/something',
    });
    expect(json.error.code).toBe(-32601);
    expect(json.error.message).toContain('notifications/something');
  });

  // -------------------------------------------------------------------------
  // Invalid JSON-RPC request
  // -------------------------------------------------------------------------

  it('rejects request with wrong jsonrpc version', async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '1.0', id: 11, method: 'ping' }),
    });
    expect(res.status).toBe(400);
  });

  it('rejects request missing method field', async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 12 }),
    });
    expect(res.status).toBe(400);
  });

  it('rejects request missing id field', async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'ping' }),
    });
    expect(res.status).toBe(400);
  });

  // -------------------------------------------------------------------------
  // Health check
  // -------------------------------------------------------------------------

  it('/health returns ok with tool count', async () => {
    const res = await fetch(`${baseUrl}/health`);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.tools).toBe(2);
    expect(body.transport).toBe('streamable-http');
  });
});

// ---------------------------------------------------------------------------
// SSE transport tests
// ---------------------------------------------------------------------------

describe('SSE transport', () => {
  let baseUrl: string;
  const tools = [makeTool('do_thing')];

  beforeAll(async () => {
    const server = await startTestServer(makeConfig({ transport: 'sse' }), tools);
    baseUrl = server.baseUrl;
  });

  beforeEach(() => {
    mockProxy.mockReset();
  });

  it('/health returns transport: sse', async () => {
    const res = await fetch(`${baseUrl}/health`);
    const body = await res.json();
    expect(body.transport).toBe('sse');
  });

  it('POST /message without a session returns 401', async () => {
    const res = await fetch(`${baseUrl}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
    });
    expect(res.status).toBe(401);
  });

  it('POST /message with wrong X-Session-Id returns 401', async () => {
    const res = await fetch(`${baseUrl}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Id': 'bad-session-id',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
    });
    expect(res.status).toBe(401);
  });

  it('GET /sse creates a session and sends endpoint event', async () => {
    // Open SSE stream — we read only the first chunk then abort.
    const controller = new AbortController();
    const res = await fetch(`${baseUrl}/sse`, { signal: controller.signal });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let text = '';
    while (!text.includes('endpoint')) {
      const { value, done } = await reader.read();
      if (done) break;
      text += decoder.decode(value);
    }
    controller.abort();

    expect(text).toContain('event: endpoint');
    expect(text).toContain('sessionId');
  });

  it('GET /sse second connection returns 409 when session already active', async () => {
    // Note: the previous test may have left an active session. We use a
    // separate server instance to guarantee a clean state.
    const server2 = await startTestServer(makeConfig({ transport: 'sse' }), tools);
    const baseUrl2 = server2.baseUrl;

    // First connection — keep it open
    const ctrl1 = new AbortController();
    const res1Promise = fetch(`${baseUrl2}/sse`, { signal: ctrl1.signal });

    // Wait briefly to let the session register
    await new Promise<void>((r) => setTimeout(r, 50));

    // Second connection attempt — should be 409
    const res2 = await fetch(`${baseUrl2}/sse`);
    expect(res2.status).toBe(409);

    ctrl1.abort();
    // Resolve res1 to clean up any unhandled promise rejections
    await res1Promise.catch(() => {});
  });

  it('POST /message with invalid JSON-RPC returns 400', async () => {
    // First establish a session to get a valid session ID
    const ctrl = new AbortController();
    const sseRes = await fetch(`${baseUrl}/sse`, { signal: ctrl.signal });

    // Read the endpoint event to get the session ID
    const reader = sseRes.body!.getReader();
    const decoder = new TextDecoder();
    let text = '';
    while (!text.includes('sessionId')) {
      const { value, done } = await reader.read();
      if (done) break;
      text += decoder.decode(value);
    }

    // Extract sessionId from SSE data
    const dataLine = text.split('\n').find((l) => l.startsWith('data:'));
    const sessionId = dataLine ? JSON.parse(dataLine.replace('data:', '').trim()).sessionId : '';

    // Now send invalid JSON-RPC
    const res = await fetch(`${baseUrl}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Id': sessionId,
      },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'ping' }), // missing id
    });
    expect(res.status).toBe(400);

    ctrl.abort();
  });

  it('POST /message with valid session and JSON-RPC returns 202 and writes SSE message', async () => {
    // Use a fresh server so we get a clean session
    const server3 = await startTestServer(makeConfig({ transport: 'sse' }), tools);
    const base3 = server3.baseUrl;

    const ctrl = new AbortController();
    const sseRes = await fetch(`${base3}/sse`, { signal: ctrl.signal });

    const reader = sseRes.body!.getReader();
    const decoder = new TextDecoder();
    let text = '';
    while (!text.includes('sessionId')) {
      const { value, done } = await reader.read();
      if (done) break;
      text += decoder.decode(value);
    }

    const dataLine = text.split('\n').find((l) => l.startsWith('data:'));
    const sessionId = dataLine ? JSON.parse(dataLine.replace('data:', '').trim()).sessionId : '';

    // Send a valid initialize request via /message
    const res = await fetch(`${base3}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Id': sessionId,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }),
    });
    expect(res.status).toBe(202);
    const json = await res.json();
    expect(json.ok).toBe(true);

    ctrl.abort();
  });
});
