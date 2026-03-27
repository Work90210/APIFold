import { randomUUID } from 'node:crypto';

import type { Request, Response, Router } from 'express';
import express from 'express';

import type { Redis } from 'ioredis';

import type { Logger } from '../observability/logger.js';
import type { ServerRegistry } from '../registry/server-registry.js';
import type { ToolLoader, ToolDefinition } from '../registry/tool-loader.js';
import type { ToolExecutorDeps, MCPToolResult } from '../mcp/tool-executor.js';
import { executeTool } from '../mcp/tool-executor.js';
import { prefixToolName, stripNamespace } from '../mcp/namespace.js';
import { checkAndIncrementUsage, getPlanLimitsForUser } from '../billing/usage-gate.js';
import { metrics } from '../observability/metrics.js';

const NAMESPACE_PATTERN = /^[a-z0-9_]{1,30}$/;

export interface CompositeMemberMeta {
  readonly serverId: string;
  readonly namespace: string;
}

export interface CompositeServerMeta {
  readonly id: string;
  readonly slug: string;
  readonly endpointId: string;
  readonly userId: string;
  readonly isActive: boolean;
  readonly tokenHash: string | null;
  readonly members: readonly CompositeMemberMeta[];
}

export interface CompositeRegistry {
  getBySlug(slug: string): CompositeServerMeta | undefined;
  getByEndpointId(endpointId: string): CompositeServerMeta | undefined;
}

export interface CompositeRouterDeps {
  readonly logger: Logger;
  readonly registry: ServerRegistry;
  readonly compositeRegistry: CompositeRegistry;
  readonly toolLoader: ToolLoader;
  readonly toolExecutorDeps: ToolExecutorDeps;
  readonly redis: Redis;
}

function jsonRpcSuccess(id: string | number, result: unknown) {
  return Object.freeze({ jsonrpc: '2.0' as const, id, result });
}

function jsonRpcError(id: string | number, code: number, message: string) {
  return Object.freeze({ jsonrpc: '2.0' as const, id, error: Object.freeze({ code, message }) });
}

function resolveComposite(compositeRegistry: CompositeRegistry, identifier: string) {
  if (/^[a-f0-9]{12}$/.test(identifier)) {
    return compositeRegistry.getByEndpointId(identifier) ?? compositeRegistry.getBySlug(identifier);
  }
  return compositeRegistry.getBySlug(identifier);
}

export function createCompositeRouter(deps: CompositeRouterDeps): Router {
  const { logger, registry, compositeRegistry, toolLoader, toolExecutorDeps } = deps;
  const router = express.Router();

  router.post('/mcp/composite/:identifier', async (req: Request, res: Response) => {
    const identifier = req.params['identifier']!;
    const composite = resolveComposite(compositeRegistry, identifier);

    if (!composite || !composite.isActive) {
      res.status(404).json({ error: 'Composite server not found' });
      return;
    }

    const authenticated = (req as unknown as Record<string, unknown>)['serverTokenVerified'] === true;
    if (!authenticated) {
      res.status(401).json({ error: 'Authorization required' });
      return;
    }

    const message = req.body as {
      readonly jsonrpc: string;
      readonly id: string | number;
      readonly method: string;
      readonly params?: Readonly<Record<string, unknown>>;
    };

    if (message.jsonrpc !== '2.0' || typeof message.method !== 'string' || !message.method || message.id === undefined) {
      res.status(400).json({ error: 'Invalid JSON-RPC request' });
      return;
    }

    try {
      let response;

      switch (message.method) {
        case 'initialize': {
          response = jsonRpcSuccess(message.id, {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: { listChanged: true },
            },
            serverInfo: {
              name: 'apifold-composite',
              version: '0.0.1',
            },
          });
          break;
        }

        case 'tools/list': {
          const allTools: Record<string, unknown>[] = [];

          for (const member of composite.members) {
            const server = registry.getById(member.serverId);
            if (!server || !server.isActive) continue;

            try {
              const toolMap = await toolLoader.getTools(server.id);
              for (const tool of toolMap.values()) {
                allTools.push({
                  name: prefixToolName(member.namespace, tool.name),
                  description: `[${member.namespace}] ${tool.description ?? ''}`,
                  inputSchema: tool.inputSchema,
                });
              }
            } catch (err) {
              logger.warn({ err, serverId: server.id, namespace: member.namespace }, 'Failed to load member tools');
            }
          }

          response = jsonRpcSuccess(message.id, { tools: allTools });
          break;
        }

        case 'tools/call': {
          const params = message.params ?? {};
          const namespacedName = params['name'];
          if (typeof namespacedName !== 'string') {
            response = jsonRpcError(message.id, -32602, 'Missing tool name');
            break;
          }

          const parsed = stripNamespace(namespacedName);
          if (!parsed) {
            response = jsonRpcError(message.id, -32602, 'Tool name must be namespaced (namespace__toolName)');
            break;
          }

          if (!NAMESPACE_PATTERN.test(parsed.namespace)) {
            response = jsonRpcError(message.id, -32602, 'Invalid namespace format');
            break;
          }

          const member = composite.members.find((m) => m.namespace === parsed.namespace);
          if (!member) {
            response = jsonRpcError(message.id, -32002, 'Namespace not found');
            break;
          }

          const server = registry.getById(member.serverId);
          if (!server || !server.isActive) {
            response = jsonRpcError(message.id, -32002, 'Member server unavailable');
            break;
          }

          const toolMap = await toolLoader.getTools(server.id);
          const tool = toolMap.get(parsed.toolName);
          if (!tool) {
            response = jsonRpcError(message.id, -32002, 'Tool not found');
            break;
          }

          // Usage gate
          const planLimits = await getPlanLimitsForUser(deps.redis, server.userId);
          const usageCheck = await checkAndIncrementUsage(
            { redis: deps.redis, logger },
            server.userId,
            planLimits,
          );

          if (!usageCheck.allowed) {
            response = jsonRpcError(message.id, -32003, 'Usage limit reached. Upgrade your plan.');
            break;
          }

          const toolInput = (params['arguments'] ?? {}) as Readonly<Record<string, unknown>>;
          const context = { requestId: randomUUID(), sessionId: 'composite' };

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
            logger.error({ err, tool: namespacedName, composite: composite.slug }, 'Composite tool execution error');
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

      res.json(response);
    } catch (err) {
      logger.error({ err, composite: composite.slug }, 'Composite dispatch error');
      res.status(500).json(jsonRpcError(message.id, -32603, 'Internal error'));
    }
  });

  return router;
}
