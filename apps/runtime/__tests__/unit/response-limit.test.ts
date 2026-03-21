import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeTool, type ToolExecutorDeps, type ExecutionContext } from '../../src/mcp/tool-executor.js';
import type { L0ServerMeta } from '../../src/registry/server-registry.js';
import type { ToolDefinition } from '../../src/registry/tool-loader.js';
import { createTestLogger } from '../helpers.js';

const mockServer: L0ServerMeta = {
  id: 'srv-1',
  slug: 'test',
  userId: 'user-1',
  transport: 'sse',
  authMode: 'none',
  baseUrl: 'https://api.example.com',
  rateLimit: 100,
  isActive: true,
};

const mockTool: ToolDefinition = {
  id: 'tool-1',
  name: 'big-response',
  description: 'Returns a big response',
  inputSchema: { type: 'object' },
};

const mockContext: ExecutionContext = { requestId: 'req-1', sessionId: 'sess-1' };

describe('Response size limit', () => {
  let deps: ToolExecutorDeps;

  beforeEach(() => {
    deps = {
      logger: createTestLogger(),
      circuitBreaker: {
        isOpen: vi.fn().mockReturnValue(false),
        recordSuccess: vi.fn(),
        recordFailure: vi.fn(),
      } as never,
      authInjector: {
        credentialCache: {
          getHeaders: vi.fn().mockResolvedValue({}),
        } as never,
      },
      timeoutMs: 5000,
    };
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns error when upstream response exceeds 10MB', async () => {
    // Create a readable stream that yields chunks exceeding 10MB
    const chunkSize = 1024 * 1024; // 1MB chunks
    let bytesYielded = 0;

    const mockReader = {
      read: vi.fn().mockImplementation(() => {
        if (bytesYielded >= 11 * 1024 * 1024) {
          return Promise.resolve({ done: true, value: undefined });
        }
        const chunk = new Uint8Array(chunkSize);
        bytesYielded += chunkSize;
        return Promise.resolve({ done: false, value: chunk });
      }),
      cancel: vi.fn(),
    };

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      body: { getReader: () => mockReader },
    });

    const result = await executeTool(deps, mockServer, mockTool, {}, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('UPSTREAM_ERROR');
    expect(mockReader.cancel).toHaveBeenCalled();
  });

  it('succeeds when response is under 10MB', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      body: null,
      text: () => Promise.resolve('{"data": "small"}'),
    });

    const result = await executeTool(deps, mockServer, mockTool, {}, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0]!.text).toBe('{"data": "small"}');
  });
});
