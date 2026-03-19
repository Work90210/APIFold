import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeTool, type ToolExecutorDeps, type ExecutionContext } from '../../src/mcp/tool-executor.js';
import type { L0ServerMeta } from '../../src/registry/server-registry.js';
import type { ToolDefinition } from '../../src/registry/tool-loader.js';
import { createTestLogger } from '../helpers.js';

const mockServer: L0ServerMeta = {
  id: 'srv-1',
  slug: 'test',
  userId: 'user-1',
  authMode: 'bearer',
  baseUrl: 'https://api.example.com',
  rateLimit: 100,
  isActive: true,
};

const mockTool: ToolDefinition = {
  id: 'tool-1',
  name: 'get-user',
  description: 'Get user info',
  inputSchema: { type: 'object' },
};

const mockContext: ExecutionContext = { requestId: 'req-1', sessionId: 'sess-1' };

describe('executeTool', () => {
  let deps: ToolExecutorDeps;
  let mockCircuitBreaker: { isOpen: ReturnType<typeof vi.fn>; recordSuccess: ReturnType<typeof vi.fn>; recordFailure: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockCircuitBreaker = {
      isOpen: vi.fn().mockReturnValue(false),
      recordSuccess: vi.fn(),
      recordFailure: vi.fn(),
    };

    deps = {
      logger: createTestLogger(),
      circuitBreaker: mockCircuitBreaker as never,
      authInjector: {
        credentialCache: {
          getHeaders: vi.fn().mockResolvedValue({ Authorization: 'Bearer tok' }),
        } as never,
      },
      timeoutMs: 5000,
    };

    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns circuit open error when circuit is open', async () => {
    mockCircuitBreaker.isOpen.mockReturnValue(true);

    const result = await executeTool(deps, mockServer, mockTool, {}, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('CIRCUIT_OPEN');
  });

  it('returns success response on successful upstream call', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      body: null,
      text: () => Promise.resolve('{"data": "ok"}'),
    });

    const result = await executeTool(deps, mockServer, mockTool, { userId: '1' }, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0]!.text).toBe('{"data": "ok"}');
    expect(mockCircuitBreaker.recordSuccess).toHaveBeenCalled();
  });

  it('records failure for 5xx upstream responses', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      body: null,
      text: () => Promise.resolve('Server error'),
    });

    const result = await executeTool(deps, mockServer, mockTool, {}, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toBe('Server error');
    expect(mockCircuitBreaker.recordFailure).toHaveBeenCalled();
    expect(mockCircuitBreaker.recordSuccess).not.toHaveBeenCalled();
  });

  it('records success for 4xx responses (client error, not upstream fault)', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
      body: null,
      text: () => Promise.resolve('Not found'),
    });

    const result = await executeTool(deps, mockServer, mockTool, {}, mockContext);

    expect(result.isError).toBe(true);
    expect(mockCircuitBreaker.recordSuccess).toHaveBeenCalled();
    expect(mockCircuitBreaker.recordFailure).not.toHaveBeenCalled();
  });

  it('records failure and returns error on network error', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network timeout'));

    const result = await executeTool(deps, mockServer, mockTool, {}, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('UPSTREAM_ERROR');
    expect(result.content[0]!.text).not.toContain('Network timeout');
    expect(mockCircuitBreaker.recordFailure).toHaveBeenCalled();
  });
});
