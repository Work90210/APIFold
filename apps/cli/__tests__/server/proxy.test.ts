import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MCPToolDefinition } from '@apifold/transformer';
import type { CliConfig } from '../../src/config/schema.js';
import { proxyToolCall } from '../../src/server/proxy.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTool(overrides?: Partial<MCPToolDefinition['_meta']>): MCPToolDefinition {
  return {
    name: 'get_user',
    description: 'Get a user by ID',
    inputSchema: { type: 'object', properties: {}, required: [] },
    _meta: {
      method: 'get',
      pathTemplate: '/users/{userId}',
      paramMap: { userId: 'path' },
      tags: [],
      deprecated: false,
      ...overrides,
    },
  };
}

function makeConfig(overrides?: Partial<CliConfig>): CliConfig {
  return Object.freeze({
    spec: './api.yaml',
    port: 3000,
    transport: 'sse',
    baseUrl: 'https://api.example.com',
    auth: { type: 'none' },
    filters: {},
    includeDeprecated: false,
    logLevel: 'info',
    ...overrides,
  }) as CliConfig;
}

function makeJsonResponse(body: unknown, status = 200): Response {
  return {
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function makeTextResponse(text: string, status = 200): Response {
  return {
    status,
    headers: new Headers({ 'content-type': 'text/plain' }),
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(text),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Mock fetch globally
// ---------------------------------------------------------------------------

const mockFetch = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// URL construction
// ---------------------------------------------------------------------------

describe('proxyToolCall — URL construction', () => {
  it('constructs the correct URL from baseUrl and pathTemplate', async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({ id: 1 }));
    await proxyToolCall(makeTool(), { userId: '42' }, makeConfig());
    const [calledUrl] = mockFetch.mock.calls[0] as [URL, ...unknown[]];
    expect(calledUrl.toString()).toBe('https://api.example.com/users/42');
  });

  it('strips trailing slash from baseUrl before joining', async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({}));
    await proxyToolCall(makeTool(), { userId: '1' }, makeConfig({ baseUrl: 'https://api.example.com/' }));
    const [calledUrl] = mockFetch.mock.calls[0] as [URL, ...unknown[]];
    expect(calledUrl.toString()).toBe('https://api.example.com/users/1');
  });

  it('URL-encodes path parameter values', async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({}));
    await proxyToolCall(makeTool(), { userId: 'user with spaces' }, makeConfig());
    const [calledUrl] = mockFetch.mock.calls[0] as [URL, ...unknown[]];
    expect(calledUrl.toString()).toContain('user%20with%20spaces');
  });

  it('replaces all occurrences of the same path param (replaceAll)', async () => {
    const tool = makeTool({
      pathTemplate: '/orgs/{orgId}/teams/{orgId}',
      paramMap: { orgId: 'path' },
    });
    mockFetch.mockResolvedValueOnce(makeJsonResponse({}));
    await proxyToolCall(tool, { orgId: 'acme' }, makeConfig());
    const [calledUrl] = mockFetch.mock.calls[0] as [URL, ...unknown[]];
    expect(calledUrl.toString()).toBe('https://api.example.com/orgs/acme/teams/acme');
  });
});

// ---------------------------------------------------------------------------
// Query params
// ---------------------------------------------------------------------------

describe('proxyToolCall — query params', () => {
  it('appends query params to the URL', async () => {
    const tool = makeTool({
      pathTemplate: '/search',
      paramMap: { q: 'query', limit: 'query' },
    });
    mockFetch.mockResolvedValueOnce(makeJsonResponse([]));
    await proxyToolCall(tool, { q: 'hello', limit: '10' }, makeConfig());
    const [calledUrl] = mockFetch.mock.calls[0] as [URL, ...unknown[]];
    const url = calledUrl.toString();
    expect(url).toContain('q=hello');
    expect(url).toContain('limit=10');
  });

  it('sends unmapped GET params as query string', async () => {
    const tool = makeTool({
      pathTemplate: '/items',
      paramMap: {},
    });
    mockFetch.mockResolvedValueOnce(makeJsonResponse([]));
    await proxyToolCall(tool, { page: '2' }, makeConfig());
    const [calledUrl] = mockFetch.mock.calls[0] as [URL, ...unknown[]];
    expect(calledUrl.toString()).toContain('page=2');
  });
});

// ---------------------------------------------------------------------------
// Header params
// ---------------------------------------------------------------------------

describe('proxyToolCall — header params', () => {
  it('sets header params in request headers', async () => {
    const tool = makeTool({
      pathTemplate: '/data',
      paramMap: { 'X-Tenant-Id': 'header' },
    });
    mockFetch.mockResolvedValueOnce(makeJsonResponse({}));
    await proxyToolCall(tool, { 'X-Tenant-Id': 'tenant-abc' }, makeConfig());
    const [, init] = mockFetch.mock.calls[0] as [URL, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.get('X-Tenant-Id')).toBe('tenant-abc');
  });
});

// ---------------------------------------------------------------------------
// Body param
// ---------------------------------------------------------------------------

describe('proxyToolCall — body param', () => {
  it('sends body param as JSON request body for POST', async () => {
    const tool = makeTool({
      method: 'post',
      pathTemplate: '/users',
      paramMap: {},
    });
    mockFetch.mockResolvedValueOnce(makeJsonResponse({ id: 99 }, 201));
    await proxyToolCall(tool, { body: { name: 'Alice' } }, makeConfig());
    const [, init] = mockFetch.mock.calls[0] as [URL, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ name: 'Alice' }));
    const headers = init.headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('does not set Content-Type when there is no body', async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({}));
    await proxyToolCall(makeTool(), { userId: '1' }, makeConfig());
    const [, init] = mockFetch.mock.calls[0] as [URL, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.get('Content-Type')).toBeNull();
  });

  it('sends unmapped POST params merged into body', async () => {
    const tool = makeTool({
      method: 'post',
      pathTemplate: '/items',
      paramMap: {},
    });
    mockFetch.mockResolvedValueOnce(makeJsonResponse({}));
    await proxyToolCall(tool, { name: 'widget', price: '9.99' }, makeConfig());
    const [, init] = mockFetch.mock.calls[0] as [URL, RequestInit];
    const parsed = JSON.parse(init.body as string);
    expect(parsed).toMatchObject({ name: 'widget', price: '9.99' });
  });
});

// ---------------------------------------------------------------------------
// Auth injection
// ---------------------------------------------------------------------------

describe('proxyToolCall — auth injection', () => {
  it('injects Bearer Authorization header for bearer auth', async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({}));
    await proxyToolCall(
      makeTool(),
      { userId: '1' },
      makeConfig({ auth: { type: 'bearer', token: 'tok_secret' } }),
    );
    const [, init] = mockFetch.mock.calls[0] as [URL, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer tok_secret');
  });

  it('injects api_key header for api_key auth', async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({}));
    await proxyToolCall(
      makeTool(),
      { userId: '1' },
      makeConfig({ auth: { type: 'api_key', header: 'X-Api-Key', token: 'k123' } }),
    );
    const [, init] = mockFetch.mock.calls[0] as [URL, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.get('X-Api-Key')).toBe('k123');
  });

  it('does not inject any auth header when auth type is none', async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({}));
    await proxyToolCall(makeTool(), { userId: '1' }, makeConfig({ auth: { type: 'none' } }));
    const [, init] = mockFetch.mock.calls[0] as [URL, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.get('Authorization')).toBeNull();
  });

  it('auth header takes precedence over a header param with the same name', async () => {
    // Even if the spec says Authorization is a header param, configured auth wins.
    const tool = makeTool({
      pathTemplate: '/secure',
      paramMap: { Authorization: 'header' },
    });
    mockFetch.mockResolvedValueOnce(makeJsonResponse({}));
    await proxyToolCall(
      tool,
      { Authorization: 'ShouldBeOverridden' },
      makeConfig({ auth: { type: 'bearer', token: 'real-token' } }),
    );
    const [, init] = mockFetch.mock.calls[0] as [URL, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer real-token');
  });
});

// ---------------------------------------------------------------------------
// SSRF protection
// ---------------------------------------------------------------------------

describe('proxyToolCall — SSRF protection', () => {
  it('throws for file: protocol', async () => {
    await expect(
      proxyToolCall(makeTool(), { userId: '1' }, makeConfig({ baseUrl: 'file:///etc/passwd' })),
    ).rejects.toThrow('Unsupported protocol');
  });

  it('throws for ftp: protocol', async () => {
    await expect(
      proxyToolCall(makeTool(), { userId: '1' }, makeConfig({ baseUrl: 'ftp://files.example.com' })),
    ).rejects.toThrow('Unsupported protocol');
  });

  it('allows https: protocol', async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({}));
    await expect(
      proxyToolCall(makeTool(), { userId: '1' }, makeConfig({ baseUrl: 'https://api.example.com' })),
    ).resolves.toBeDefined();
  });

  it('allows http: protocol', async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({}));
    await expect(
      proxyToolCall(makeTool(), { userId: '1' }, makeConfig({ baseUrl: 'http://localhost:8080' })),
    ).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Missing _meta
// ---------------------------------------------------------------------------

describe('proxyToolCall — missing _meta', () => {
  it('throws when tool._meta is absent', async () => {
    const tool = {
      ...makeTool(),
      _meta: undefined,
    } as unknown as MCPToolDefinition;
    await expect(proxyToolCall(tool, {}, makeConfig())).rejects.toThrow(
      'missing _meta',
    );
  });
});

// ---------------------------------------------------------------------------
// Missing baseUrl
// ---------------------------------------------------------------------------

describe('proxyToolCall — missing baseUrl', () => {
  it('throws when baseUrl is not set', async () => {
    const config = makeConfig({ baseUrl: undefined });
    await expect(proxyToolCall(makeTool(), { userId: '1' }, config)).rejects.toThrow(
      'baseUrl is required',
    );
  });

  it('throws when baseUrl is an empty string', async () => {
    const config = makeConfig({ baseUrl: '' });
    await expect(proxyToolCall(makeTool(), { userId: '1' }, config)).rejects.toThrow(
      'baseUrl is required',
    );
  });
});

// ---------------------------------------------------------------------------
// Response handling
// ---------------------------------------------------------------------------

describe('proxyToolCall — response handling', () => {
  it('returns parsed JSON body when content-type is application/json', async () => {
    const payload = { id: 1, name: 'Alice' };
    mockFetch.mockResolvedValueOnce(makeJsonResponse(payload));
    const result = await proxyToolCall(makeTool(), { userId: '1' }, makeConfig());
    expect(result.body).toEqual(payload);
    expect(result.status).toBe(200);
    expect(result.contentType).toContain('application/json');
  });

  it('returns text body when content-type is text/plain', async () => {
    mockFetch.mockResolvedValueOnce(makeTextResponse('hello world'));
    const result = await proxyToolCall(makeTool(), { userId: '1' }, makeConfig());
    expect(result.body).toBe('hello world');
    expect(result.contentType).toContain('text/plain');
  });

  it('returns 404 status for upstream 404 responses', async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({ message: 'Not found' }, 404));
    const result = await proxyToolCall(makeTool(), { userId: '999' }, makeConfig());
    expect(result.status).toBe(404);
  });

  it('returns 500 status for upstream 500 responses', async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({ error: 'Server error' }, 500));
    const result = await proxyToolCall(makeTool(), { userId: '1' }, makeConfig());
    expect(result.status).toBe(500);
  });

  it('returns a frozen result object', async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({}));
    const result = await proxyToolCall(makeTool(), { userId: '1' }, makeConfig());
    expect(Object.isFrozen(result)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Timeout
// ---------------------------------------------------------------------------

describe('proxyToolCall — timeout', () => {
  it('passes an AbortSignal to fetch', async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({}));
    await proxyToolCall(makeTool(), { userId: '1' }, makeConfig());
    const [, init] = mockFetch.mock.calls[0] as [URL, RequestInit];
    expect(init.signal).toBeDefined();
  });
});
