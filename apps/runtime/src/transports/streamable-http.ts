import { randomUUID } from 'node:crypto';

import type { Request, Response, Router } from 'express';
import express from 'express';

import type { ProtocolHandler, JsonRpcRequest } from '../mcp/protocol-handler.js';
import type { Logger } from '../observability/logger.js';
import type { ServerRegistry } from '../registry/server-registry.js';
import type { ToolLoader, ToolDefinition } from '../registry/tool-loader.js';
import type { ToolExecutorDeps, MCPToolResult } from '../mcp/tool-executor.js';
import { executeTool } from '../mcp/tool-executor.js';
import { metrics } from '../observability/metrics.js';

export interface StreamableHTTPDeps {
  readonly logger: Logger;
  readonly registry: ServerRegistry;
  readonly toolLoader: ToolLoader;
  readonly toolExecutorDeps: ToolExecutorDeps;
}

interface StreamableSession {
  readonly id: string;
  readonly slug: string;
  readonly createdAt: number;
}

// In-memory session tracking for Streamable HTTP
const sessions = new Map<string, StreamableSession>();

function jsonRpcSuccess(id: string | number, result: unknown) {
  return Object.freeze({ jsonrpc: '2.0' as const, id, result });
}

function jsonRpcError(id: string | number, code: number, message: string) {
  return Object.freeze({ jsonrpc: '2.0' as const, id, error: Object.freeze({ code, message }) });
}

function toMcpToolDef(tool: ToolDefinition): Record<string, unknown> {
  return {
    name: tool.name,
    description: tool.description ?? '',
    inputSchema: tool.inputSchema,
  };
}

export function createStreamableHTTPRouter(deps: StreamableHTTPDeps): Router {
  const { logger, registry, toolLoader, toolExecutorDeps } = deps;
  const router = express.Router();

  // Streamable HTTP endpoint — stateless per-request
  router.post('/mcp/:slug', async (req: Request, res: Response) => {
    const slug = req.params['slug']!;
    const server = registry.getBySlug(slug);

    if (!server || !server.isActive) {
      res.status(404).json({ error: 'Server not found' });
      return;
    }

    if (server.transport !== 'streamable-http') {
      res.status(400).json({ error: 'This server uses SSE transport. Use GET /mcp/:slug/sse instead.' });
      return;
    }

    const message = req.body as JsonRpcRequest;
    if (message.jsonrpc !== '2.0' || typeof message.method !== 'string' || !message.method || message.id === undefined) {
      res.status(400).json({ error: 'Invalid JSON-RPC request' });
      return;
    }

    // Session management via Mcp-Session-Id header
    let sessionId = req.headers['mcp-session-id'] as string | undefined;
    let session = sessionId ? sessions.get(sessionId) : undefined;

    try {
      let response;

      switch (message.method) {
        case 'initialize': {
          // Create a new session
          sessionId = randomUUID();
          session = { id: sessionId, slug, createdAt: Date.now() };
          sessions.set(sessionId, session);

          response = jsonRpcSuccess(message.id, {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: { listChanged: true },
            },
            serverInfo: {
              name: 'apifold-runtime',
              version: '0.0.1',
            },
          });
          break;
        }

        case 'tools/list': {
          const toolMap = await toolLoader.getTools(server.id);
          const tools = [...toolMap.values()].map(toMcpToolDef);
          response = jsonRpcSuccess(message.id, { tools });
          break;
        }

        case 'tools/call': {
          const params = message.params ?? {};
          const toolName = params['name'];
          if (typeof toolName !== 'string') {
            response = jsonRpcError(message.id, -32602, 'Missing tool name');
            break;
          }

          const toolMap = await toolLoader.getTools(server.id);
          const tool = toolMap.get(toolName);
          if (!tool) {
            response = jsonRpcError(message.id, -32002, 'Tool not found');
            break;
          }

          const toolInput = (params['arguments'] ?? {}) as Readonly<Record<string, unknown>>;
          const context = { requestId: randomUUID(), sessionId: sessionId ?? 'anonymous' };

          metrics.incrementCounter('total_tool_calls');
          const start = performance.now();

          try {
            const result: MCPToolResult = await executeTool(
              toolExecutorDeps,
              server,
              tool,
              toolInput,
              context,
            );
            metrics.observeHistogram('tool_call_duration_ms', Math.round(performance.now() - start));
            response = jsonRpcSuccess(message.id, result);
          } catch (err) {
            metrics.incrementCounter('tool_call_errors');
            metrics.observeHistogram('tool_call_duration_ms', Math.round(performance.now() - start));
            logger.error({ err, tool: toolName, slug }, 'Tool execution error');
            response = jsonRpcError(message.id, -32603, 'Tool execution failed');
          }
          break;
        }

        case 'ping':
          response = jsonRpcSuccess(message.id, { pong: true });
          break;

        default:
          response = jsonRpcError(message.id, -32601, 'Method not found');
      }

      // Set session header on response
      if (sessionId) {
        res.setHeader('Mcp-Session-Id', sessionId);
      }

      res.json(response);
    } catch (err) {
      logger.error({ err, slug }, 'Streamable HTTP error');
      res.status(500).json(jsonRpcError(message.id, -32603, 'Internal error'));
    }
  });

  return router;
}
