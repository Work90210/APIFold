import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProtocolHandler, type JsonRpcRequest } from '../../src/mcp/protocol-handler.js';
import type { SSESession } from '../../src/mcp/session-manager.js';
import type { L0ServerMeta } from '../../src/registry/server-registry.js';
import { createTestLogger } from '../helpers.js';

function makeSession(slug = 'test-server'): SSESession {
  return {
    id: 'sess-1',
    slug,
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    res: { writableEnded: false, write: vi.fn() } as never,
  };
}

function makeRequest(method: string, params?: Record<string, unknown>): JsonRpcRequest {
  return { jsonrpc: '2.0', id: 1, method, params };
}

const mockServer: L0ServerMeta = {
  id: 'srv-1',
  slug: 'test-server',
  userId: 'user-1',
  authMode: 'bearer',
  baseUrl: 'https://api.example.com',
  rateLimit: 100,
  isActive: true,
};

describe('ProtocolHandler', () => {
  let handler: ProtocolHandler;
  let mockRegistry: { getBySlug: ReturnType<typeof vi.fn> };
  let mockToolLoader: { getTools: ReturnType<typeof vi.fn> };
  let mockSessionManager: { touch: ReturnType<typeof vi.fn>; sendEvent: ReturnType<typeof vi.fn> };
  let sentMessages: string[];

  beforeEach(() => {
    sentMessages = [];
    mockRegistry = { getBySlug: vi.fn().mockReturnValue(mockServer) };
    mockToolLoader = {
      getTools: vi.fn().mockResolvedValue(
        new Map([
          ['get-user', { id: 't1', name: 'get-user', description: 'Get user', inputSchema: {} }],
        ]),
      ),
    };
    mockSessionManager = {
      touch: vi.fn(),
      sendEvent: vi.fn((_session: unknown, _event: string, data: string) => {
        sentMessages.push(data);
      }),
    };

    handler = new ProtocolHandler({
      logger: createTestLogger(),
      registry: mockRegistry as never,
      toolLoader: mockToolLoader as never,
      sessionManager: mockSessionManager as never,
      toolExecutorDeps: {
        logger: createTestLogger(),
        circuitBreaker: { isOpen: vi.fn().mockReturnValue(false), recordSuccess: vi.fn(), recordFailure: vi.fn() } as never,
        authInjector: { credentialCache: { getHeaders: vi.fn().mockResolvedValue({}) } as never },
        timeoutMs: 5000,
      },
    });
  });

  it('handles initialize method', async () => {
    const session = makeSession();
    await handler.handleMessage(session, makeRequest('initialize'));

    expect(mockSessionManager.sendEvent).toHaveBeenCalled();
    const response = JSON.parse(sentMessages[0]!);
    expect(response.result.protocolVersion).toBe('2024-11-05');
    expect(response.result.capabilities.tools).toBeDefined();
  });

  it('handles ping method', async () => {
    const session = makeSession();
    await handler.handleMessage(session, makeRequest('ping'));

    const response = JSON.parse(sentMessages[0]!);
    expect(response.result.pong).toBe(true);
  });

  it('handles tools/list method', async () => {
    const session = makeSession();
    await handler.handleMessage(session, makeRequest('tools/list'));

    const response = JSON.parse(sentMessages[0]!);
    expect(response.result.tools).toHaveLength(1);
    expect(response.result.tools[0].name).toBe('get-user');
  });

  it('returns error for tools/list when server not found', async () => {
    mockRegistry.getBySlug.mockReturnValue(undefined);
    const session = makeSession();
    await handler.handleMessage(session, makeRequest('tools/list'));

    const response = JSON.parse(sentMessages[0]!);
    expect(response.error.code).toBe(-32001);
  });

  it('returns error for tools/list when getTools throws', async () => {
    mockToolLoader.getTools.mockRejectedValue(new Error('DB down'));
    const session = makeSession();
    await handler.handleMessage(session, makeRequest('tools/list'));

    const response = JSON.parse(sentMessages[0]!);
    expect(response.error.code).toBe(-32603);
    expect(response.error.message).toBe('Failed to load tools');
  });

  it('returns method not found for unknown methods', async () => {
    const session = makeSession();
    await handler.handleMessage(session, makeRequest('unknown/method'));

    const response = JSON.parse(sentMessages[0]!);
    expect(response.error.code).toBe(-32601);
  });

  it('returns error for tools/call with missing tool name', async () => {
    const session = makeSession();
    await handler.handleMessage(session, makeRequest('tools/call', {}));

    const response = JSON.parse(sentMessages[0]!);
    expect(response.error.code).toBe(-32602);
  });

  it('returns error for tools/call with unknown tool', async () => {
    const session = makeSession();
    await handler.handleMessage(session, makeRequest('tools/call', { name: 'nonexistent' }));

    const response = JSON.parse(sentMessages[0]!);
    expect(response.error.code).toBe(-32002);
  });

  it('returns error for tools/call when getTools throws', async () => {
    mockToolLoader.getTools.mockRejectedValue(new Error('DB down'));
    const session = makeSession();
    await handler.handleMessage(session, makeRequest('tools/call', { name: 'get-user' }));

    const response = JSON.parse(sentMessages[0]!);
    expect(response.error.code).toBe(-32603);
    expect(response.error.message).toBe('Failed to load tools');
  });

  it('touches session on every message', async () => {
    const session = makeSession();
    await handler.handleMessage(session, makeRequest('ping'));
    expect(mockSessionManager.touch).toHaveBeenCalledWith('sess-1');
  });
});
