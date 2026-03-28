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

export type ProfileFetcher = (serverId: string) => Promise<readonly string[] | null>;

export type DbClient = {
  query<T>(sql: string, params?: readonly unknown[]): Promise<{ readonly rows: readonly T[] }>;
};

export interface ProtocolHandlerDeps {
  readonly logger: Logger;
  readonly registry: ServerRegistry;
  readonly toolLoader: ToolLoader;
  readonly sessionManager: SessionManager;
  readonly toolExecutorDeps: ToolExecutorDeps;
  readonly redis: Redis;
  readonly db?: DbClient;
  readonly fetchProfileToolIds?: ProfileFetcher;
}

export class ProtocolHandler {
  private readonly logger: Logger;
  private readonly registry: ServerRegistry;
  private readonly toolLoader: ToolLoader;
  private readonly sessionManager: SessionManager;
  private readonly executorDeps: ToolExecutorDeps;
  private readonly redis: Redis;
  private readonly db: DbClient | null;
  private readonly fetchProfileToolIds: ProfileFetcher | null;

  constructor(deps: ProtocolHandlerDeps) {
    this.logger = deps.logger;
    this.registry = deps.registry;
    this.toolLoader = deps.toolLoader;
    this.sessionManager = deps.sessionManager;
    this.executorDeps = deps.toolExecutorDeps;
    this.redis = deps.redis;
    this.db = deps.db ?? null;
    this.fetchProfileToolIds = deps.fetchProfileToolIds ?? null;
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
      case 'resources/list':
        return this.handleResourcesList(session, req);
      case 'resources/read':
        return this.handleResourcesRead(session, req);
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
        resources: { subscribe: true, listChanged: true },
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
      let tools = [...toolMap.values()];

      const allowedToolIds = await this.resolveAllowedToolIds(server.id, session);
      if (allowedToolIds) {
        const allowedSet = new Set(allowedToolIds);
        tools = tools.filter((t) => allowedSet.has(t.id));
      }

      return jsonRpcSuccess(req.id, { tools: tools.map(toMcpToolDef) });
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

    let allowedToolIds: readonly string[] | null;
    try {
      allowedToolIds = await this.resolveAllowedToolIds(server.id, session);
    } catch (err) {
      this.logger.error({ err, slug: session.slug }, 'Failed to resolve profile');
      return jsonRpcError(req.id, -32603, 'Failed to resolve profile');
    }

    if (allowedToolIds && !allowedToolIds.includes(tool.id)) {
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
      this.logger.warn(
        { userId: server.userId, currentUsage: usageCheck.currentUsage, limit: usageCheck.limit },
        'Usage limit reached',
      );
      return jsonRpcError(req.id, -32003, 'Usage limit reached. Upgrade your plan.');
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
      const durationMs = Math.round(performance.now() - start);
      metrics.observeHistogram('tool_call_duration_ms', durationMs);

      this.writeRequestLog(server.id, tool.id, server.userId, context.requestId, tool.name, `/${server.slug}/sse`, 200, durationMs);

      return jsonRpcSuccess(req.id, result);
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      metrics.incrementCounter('tool_call_errors');
      metrics.observeHistogram('tool_call_duration_ms', durationMs);
      this.logger.error({ err, tool: toolName, slug: session.slug }, 'Tool execution error');

      this.writeRequestLog(server.id, tool.id, server.userId, context.requestId, tool.name, `/${server.slug}/sse`, 500, durationMs);

      return jsonRpcError(req.id, -32603, 'Tool execution failed');
    }
  }

  private async handleResourcesList(
    session: SSESession,
    req: JsonRpcRequest,
  ): Promise<JsonRpcResponse> {
    const server = this.registry.getBySlug(session.slug);
    if (!server) {
      return jsonRpcError(req.id, -32001, 'Server not found');
    }

    try {
      const pattern = `webhook:latest:${server.id}:*`;
      const keys = await scanKeys(this.redis, pattern);
      const prefix = `webhook:latest:${server.id}:`;

      const resources = keys
        .map((key) => key.slice(prefix.length))
        .filter((name) => name.length > 0 && name.length <= 200 && /^[a-zA-Z0-9_.:-]+$/.test(name))
        .map((eventName) => ({
          uri: `webhook://${server.slug}/${eventName}`,
          name: eventName,
          description: `Latest ${eventName} webhook event`,
          mimeType: 'application/json',
        }));

      return jsonRpcSuccess(req.id, { resources });
    } catch (err) {
      this.logger.error({ err, slug: session.slug }, 'Failed to list resources');
      return jsonRpcError(req.id, -32603, 'Failed to list resources');
    }
  }

  private async handleResourcesRead(
    session: SSESession,
    req: JsonRpcRequest,
  ): Promise<JsonRpcResponse> {
    const server = this.registry.getBySlug(session.slug);
    if (!server) {
      return jsonRpcError(req.id, -32001, 'Server not found');
    }

    const params = req.params ?? {};
    const uri = params['uri'];
    if (typeof uri !== 'string') {
      return jsonRpcError(req.id, -32602, 'Missing resource URI');
    }

    // Parse webhook:// URI — verify host matches the addressed server
    const match = uri.match(/^webhook:\/\/([^/]+)\/(.+)$/);
    if (!match) {
      return jsonRpcError(req.id, -32602, 'Invalid resource URI');
    }
    const uriHost = match[1]!;
    const eventName = match[2]!;
    if (uriHost !== server.slug) {
      return jsonRpcError(req.id, -32602, 'Resource URI does not match this server');
    }

    if (!/^[a-zA-Z0-9_.:-]+$/.test(eventName) || eventName.length > 200) {
      return jsonRpcError(req.id, -32602, 'Invalid event name in resource URI');
    }

    try {
      const redisKey = `webhook:latest:${server.id}:${eventName}`;
      const data = await this.redis.get(redisKey);

      if (!data) {
        return jsonRpcError(req.id, -32002, 'Resource not found');
      }

      return jsonRpcSuccess(req.id, {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: data,
        }],
      });
    } catch (err) {
      this.logger.error({ err, slug: session.slug, uri }, 'Failed to read resource');
      return jsonRpcError(req.id, -32603, 'Failed to read resource');
    }
  }

  private async resolveAllowedToolIds(
    serverId: string,
    session: SSESession,
  ): Promise<readonly string[] | null> {
    if (session.profileToolIds !== undefined) {
      return session.profileToolIds;
    }

    if (!this.fetchProfileToolIds) {
      return null;
    }

    return this.fetchProfileToolIds(serverId);
  }

  private writeRequestLog(
    serverId: string,
    toolId: string,
    userId: string,
    requestId: string,
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
  ): void {
    if (!this.db) return;

    // Fire-and-forget — don't block the response
    this.db.query(
      `INSERT INTO request_logs (server_id, tool_id, user_id, request_id, method, path, status_code, duration_ms, tool_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [serverId, toolId, userId, requestId, 'POST', path, statusCode, durationMs, method],
    ).catch((err) => {
      this.logger.warn({ err }, 'Failed to write request log');
    });
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

async function scanKeys(redis: Redis, pattern: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor = '0';
  do {
    const [nextCursor, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    keys.push(...batch);
    cursor = nextCursor;
  } while (cursor !== '0');
  return keys;
}
