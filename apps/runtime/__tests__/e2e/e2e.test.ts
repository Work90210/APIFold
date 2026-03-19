import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'http';
import type { ChildProcess } from 'child_process';
import { spawn } from 'child_process';
import { startMockUpstream } from './mock-upstream.js';

const RUNTIME_PORT = 4567;
const UPSTREAM_PORT = 4568;
const DB_URL = `postgresql://kylefuhri@localhost:5432/apifold_e2e`;
const REDIS_URL = 'redis://localhost:6379';
const VAULT_SECRET = 'e2e-test-vault-secret-that-is-at-least-32-chars';
const VAULT_SALT = 'e2e-test-vault-salt-value-that-is-at-least-32-chars';
const RUNTIME_SECRET = 'e2e-test-runtime-secret-at-least-32-characters!!';

let runtimeProcess: ChildProcess;
let upstreamServer: Server;
let serverId: string;

async function waitForReady(url: string, timeoutMs = 10_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function seedDatabase(): Promise<string> {
  const { default: postgres } = await import('postgres');
  const sql = postgres(DB_URL);

  // Clean any existing test data
  await sql`DELETE FROM mcp_servers WHERE slug = 'e2e-weather'`;

  // Insert test server pointing to mock upstream
  const [server] = await sql`
    INSERT INTO mcp_servers (user_id, slug, name, auth_mode, base_url, rate_limit)
    VALUES ('e2e-user', 'e2e-weather', 'E2E Weather', 'none', ${`http://127.0.0.1:${UPSTREAM_PORT}`}, 1000)
    RETURNING id
  `;

  // Insert test tool
  await sql`
    INSERT INTO mcp_tools (server_id, name, description, input_schema)
    VALUES (${server!.id}, 'get-weather', 'Get weather for a city', ${{type: 'object', properties: {city: {type: 'string'}}}})
  `;

  await sql.end();
  return server!.id as string;
}

async function cleanDatabase(): Promise<void> {
  const { default: postgres } = await import('postgres');
  const sql = postgres(DB_URL);
  await sql`DELETE FROM mcp_servers WHERE slug = 'e2e-weather'`;
  await sql.end();
}

describe('E2E: Full MCP Runtime Flow', () => {
  beforeAll(async () => {
    // 1. Start mock upstream
    upstreamServer = await startMockUpstream(UPSTREAM_PORT);

    // 2. Seed DB
    serverId = await seedDatabase();

    // 3. Start runtime process
    runtimeProcess = spawn('npx', ['tsx', 'src/index.ts'], {
      cwd: '/Users/kylefuhri/development/Personal/MCP/apps/runtime',
      env: {
        ...process.env,
        RUNTIME_PORT: String(RUNTIME_PORT),
        NODE_ENV: 'test',
        DATABASE_URL: DB_URL,
        REDIS_URL: REDIS_URL,
        VAULT_SECRET: VAULT_SECRET,
        VAULT_SALT: VAULT_SALT,
        MCP_RUNTIME_SECRET: RUNTIME_SECRET,
        LOG_LEVEL: 'silent',
        CORS_ORIGINS: '*',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Capture stderr for debugging
    let stderr = '';
    runtimeProcess.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    try {
      await waitForReady(`http://127.0.0.1:${RUNTIME_PORT}/health`, 15_000);
    } catch {
      runtimeProcess.kill();
      throw new Error(`Runtime failed to start. stderr:\n${stderr}`);
    }
  }, 20_000);

  afterAll(async () => {
    runtimeProcess?.kill('SIGTERM');
    await new Promise<void>((resolve) => {
      if (runtimeProcess) {
        runtimeProcess.on('exit', () => resolve());
        setTimeout(resolve, 3000);
      } else {
        resolve();
      }
    });
    await new Promise<void>((resolve) => upstreamServer?.close(() => resolve()));
    await cleanDatabase();
  }, 10_000);

  it('health endpoint returns ok', async () => {
    const res = await fetch(`http://127.0.0.1:${RUNTIME_PORT}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('readiness endpoint returns ready', async () => {
    const res = await fetch(`http://127.0.0.1:${RUNTIME_PORT}/health/ready`);
    expect(res.status).toBe(200);
  });

  it('metrics endpoint returns prometheus format', async () => {
    const res = await fetch(`http://127.0.0.1:${RUNTIME_PORT}/metrics`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('registry_load_total');
  });

  it('returns 404 for unknown server slug', async () => {
    const res = await fetch(`http://127.0.0.1:${RUNTIME_PORT}/mcp/nonexistent/sse`);
    expect(res.status).toBe(404);
  });

  it('full SSE flow: connect → initialize → tools/list → tools/call → verify upstream response', async () => {
    // 1. Connect SSE
    const sseRes = await fetch(`http://127.0.0.1:${RUNTIME_PORT}/mcp/e2e-weather/sse`);
    expect(sseRes.status).toBe(200);
    expect(sseRes.headers.get('content-type')).toBe('text/event-stream');

    const reader = sseRes.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let sessionId = '';

    // Read endpoint event
    for (let i = 0; i < 20; i++) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const match = buffer.match(/event: endpoint\ndata: (.+)\n/);
      if (match) {
        sessionId = JSON.parse(match[1]!).sessionId;
        break;
      }
    }
    expect(sessionId).toBeTruthy();

    // 2. Initialize
    const initRes = await fetch(`http://127.0.0.1:${RUNTIME_PORT}/mcp/e2e-weather/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }),
    });
    expect(initRes.status).toBe(202);

    // 3. tools/list
    await fetch(`http://127.0.0.1:${RUNTIME_PORT}/mcp/e2e-weather/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
    });

    // 4. tools/call
    await fetch(`http://127.0.0.1:${RUNTIME_PORT}/mcp/e2e-weather/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 3, method: 'tools/call',
        params: { name: 'get-weather', arguments: { city: 'Tokyo' } },
      }),
    });

    // 5. Read all SSE responses
    await new Promise((r) => setTimeout(r, 500));
    for (let i = 0; i < 30; i++) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const msgs = buffer.match(/event: message\ndata: .+\n/g);
      if (msgs && msgs.length >= 3) break;
    }

    const messages = [...buffer.matchAll(/event: message\ndata: (.+)\n/g)]
      .map(([, data]) => JSON.parse(data!));

    // Verify initialize
    const initResponse = messages.find((m) => m.id === 1);
    expect(initResponse?.result?.protocolVersion).toBe('2024-11-05');

    // Verify tools/list
    const listResponse = messages.find((m) => m.id === 2);
    expect(listResponse?.result?.tools).toHaveLength(1);
    expect(listResponse?.result?.tools[0].name).toBe('get-weather');

    // Verify tools/call — actual data from the real mock upstream
    const callResponse = messages.find((m) => m.id === 3);
    expect(callResponse?.result?.isError).toBe(false);
    const toolResult = JSON.parse(callResponse?.result?.content[0]?.text);
    expect(toolResult.city).toBe('Tokyo');
    expect(toolResult.temperature).toBe(22);
    expect(toolResult.source).toBe('mock-upstream');

    reader.cancel();
  }, 15_000);

  it('rejects cross-server session hijacking', async () => {
    // Connect to e2e-weather
    const sseRes = await fetch(`http://127.0.0.1:${RUNTIME_PORT}/mcp/e2e-weather/sse`);
    const reader = sseRes.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let sessionId = '';

    for (let i = 0; i < 20; i++) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const match = buffer.match(/event: endpoint\ndata: (.+)\n/);
      if (match) {
        sessionId = JSON.parse(match[1]!).sessionId;
        break;
      }
    }

    // Try using that session on a different slug
    const res = await fetch(`http://127.0.0.1:${RUNTIME_PORT}/mcp/other-server/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
    });
    expect(res.status).toBe(403);

    reader.cancel();
  });

  it('service auth protects internal endpoints', async () => {
    // No secret
    const res1 = await fetch(`http://127.0.0.1:${RUNTIME_PORT}/internal/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect(res1.status).toBe(401);

    // Wrong secret
    const res2 = await fetch(`http://127.0.0.1:${RUNTIME_PORT}/internal/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Runtime-Secret': 'wrong' },
      body: '{}',
    });
    expect(res2.status).toBe(401);

    // Correct secret
    const res3 = await fetch(`http://127.0.0.1:${RUNTIME_PORT}/internal/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Runtime-Secret': RUNTIME_SECRET },
      body: '{}',
    });
    expect(res3.status).toBe(200);
  });

  it('rejects invalid JSON-RPC', async () => {
    const sseRes = await fetch(`http://127.0.0.1:${RUNTIME_PORT}/mcp/e2e-weather/sse`);
    const reader = sseRes.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let sessionId = '';

    for (let i = 0; i < 20; i++) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const match = buffer.match(/event: endpoint\ndata: (.+)\n/);
      if (match) {
        sessionId = JSON.parse(match[1]!).sessionId;
        break;
      }
    }

    // Wrong jsonrpc version
    const res = await fetch(`http://127.0.0.1:${RUNTIME_PORT}/mcp/e2e-weather/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
      body: JSON.stringify({ jsonrpc: '1.0', id: 1, method: 'ping' }),
    });
    expect(res.status).toBe(400);

    reader.cancel();
  });
}, 60_000);
