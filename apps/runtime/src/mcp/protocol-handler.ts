import { randomUUID } from 'node:crypto';
import type { Redis } from 'ioredis';

import type { Logger } from '../observability/logger.js';
import { metrics } from '../observability/metrics.js';
import type { ServerRegistry } from '../registry/server-registry.js';
import type { ToolLoader, ToolDefinition } from '../registry/tool-loader.js';
import { checkAndIncrementUsage, getPlanLimitsForUser } from '../billing/usage-gate.js';

import type { SessionManager, SSESession } from './session-manager.js';
import type { ToolExecutorDeps, MCPToolResult } from './tool-executor.js';
import { executeTool } from './tool-executor.js';

/** MCP JSON-RPC request shape. */
export interface JsonRpcRequest {
  readonly jsonrpc: '2.0';
  readonly id: string | number;
  readonly method: string;
  readonly params?: Readonly<Record<string, unknown>>;
}

/** MCP JSON-RPC response shape. */
interface JsonRpcResponse {
  readonly jsonrpc: '2.0';
  readonly id: string | number;
  readonly result?: unknown;
  readonly error?: { readonly code: number; readonly message: string };
}

export interface ProtocolHandlerDeps {
  readonly logger: Logger;
  readonly registry: ServerRegistry;
  readonly toolLoader: ToolLoader;
  readonly sessionManager: SessionManager;
  readonly toolExecutorDeps: ToolExecutorDeps;
  readonly redis: Redis;
}

export class ProtocolHandler {
  private readonly logger: Logger;
  private readonly registry: ServerRegistry;
  private readonly toolLoader: ToolLoader;
  private readonly sessionManager: SessionManager;
  private readonly executorDeps: ToolExecutorDeps;
  private readonly redis: Redis;

  constructor(deps: ProtocolHandlerDeps) {
    this.logger = deps.logger;
    this.registry = deps.registry;
    this.toolLoader = deps.toolLoader;
    this.sessionManager = deps.sessionManager;
    this.executorDeps = deps.toolExecutorDeps;
    this.redis = deps.redis;
  }

  async handleMessage(session: SSESession, message: JsonRpcRequest): Promise<void> {
    this.sessionManager.touch(session.id);

    const response = await this.dispatch(session, message);
    this.sessionManager.sendEvent(session, 'message', JSON.stringify(response));
  }

  private async dispatch(session: SSESession, req: JsonRpcRequest): Promise<JsonRpcResponse> {
    switch (req.method) {
      case 'initialize':
        return this.handleInitialize(req);
      case 'tools/list':
        return this.handleToolsList(session, req);
      case 'tools/call':
        return this.handleToolsCall(session, req);
      case 'ping':
        return jsonRpcSuccess(req.id, { pong: true });
      default:
        return jsonRpcError(req.id, -32601, 'Method not found');
    }
  }

  private handleInitialize(req: JsonRpcRequest): JsonRpcResponse {
    return jsonRpcSuccess(req.id, {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: { listChanged: true },
      },
      serverInfo: {
        name: 'apifold-runtime',
        version: '0.0.1',
      },
    });
  }

  private async handleToolsList(
    session: SSESession,
    req: JsonRpcRequest,
  ): Promise<JsonRpcResponse> {
    const server = this.registry.getBySlug(session.slug);
    if (!server) {
      return jsonRpcError(req.id, -32001, 'Server not found');
    }

    try {
      const toolMap = await this.toolLoader.getTools(server.id);
      const tools = [...toolMap.values()].map(toMcpToolDef);
      return jsonRpcSuccess(req.id, { tools });
    } catch (err) {
      this.logger.error({ err, slug: session.slug }, 'Failed to load tools');
      return jsonRpcError(req.id, -32603, 'Failed to load tools');
    }
  }

  private async handleToolsCall(
    session: SSESession,
    req: JsonRpcRequest,
  ): Promise<JsonRpcResponse> {
    const server = this.registry.getBySlug(session.slug);
    if (!server) {
      return jsonRpcError(req.id, -32001, 'Server not found');
    }

    const params = req.params ?? {};
    const toolName = params['name'];
    if (typeof toolName !== 'string') {
      return jsonRpcError(req.id, -32602, 'Missing tool name');
    }

    let toolMap: ReadonlyMap<string, ToolDefinition>;
    try {
      toolMap = await this.toolLoader.getTools(server.id);
    } catch (err) {
      this.logger.error({ err, slug: session.slug }, 'Failed to load tools for call');
      return jsonRpcError(req.id, -32603, 'Failed to load tools');
    }

    const tool = toolMap.get(toolName);
    if (!tool) {
      return jsonRpcError(req.id, -32002, 'Tool not found');
    }

    // Usage gate: check plan limits after tool validation, before executing
    const planLimits = await getPlanLimitsForUser(this.redis, server.userId);
    const usageCheck = await checkAndIncrementUsage(
      { redis: this.redis, logger: this.logger },
      server.userId,
      planLimits,
    );

    if (!usageCheck.allowed) {
      return jsonRpcError(
        req.id,
        -32003,
        `Usage limit reached (${usageCheck.currentUsage}/${usageCheck.limit}). Upgrade your plan.`,
      );
    }

    const toolInput = (params['arguments'] ?? {}) as Readonly<Record<string, unknown>>;
    const context = { requestId: randomUUID(), sessionId: session.id };

    metrics.incrementCounter('total_tool_calls');
    const start = performance.now();

    try {
      const result: MCPToolResult = await executeTool(
        this.executorDeps,
        server,
        tool,
        toolInput,
        context,
      );
      metrics.observeHistogram('tool_call_duration_ms', Math.round(performance.now() - start));
      return jsonRpcSuccess(req.id, result);
    } catch (err) {
      metrics.incrementCounter('tool_call_errors');
      metrics.observeHistogram('tool_call_duration_ms', Math.round(performance.now() - start));
      this.logger.error({ err, tool: toolName, slug: session.slug }, 'Tool execution error');
      return jsonRpcError(req.id, -32603, 'Tool execution failed');
    }
  }
}

function toMcpToolDef(tool: ToolDefinition): Record<string, unknown> {
  return {
    name: tool.name,
    description: tool.description ?? '',
    inputSchema: tool.inputSchema,
  };
}

function jsonRpcSuccess(id: string | number, result: unknown): JsonRpcResponse {
  return Object.freeze({ jsonrpc: '2.0' as const, id, result });
}

function jsonRpcError(id: string | number, code: number, message: string): JsonRpcResponse {
  return Object.freeze({ jsonrpc: '2.0' as const, id, error: Object.freeze({ code, message }) });
}
