import { randomUUID } from 'node:crypto';

import type { Request, Response, Router } from 'express';
import express from 'express';

import type { Redis } from 'ioredis';

import type { JsonRpcRequest } from '../mcp/protocol-handler.js';
import type { Logger } from '../observability/logger.js';
import type { ServerRegistry } from '../registry/server-registry.js';
import type { ToolLoader, ToolDefinition } from '../registry/tool-loader.js';
import type { ToolExecutorDeps, MCPToolResult } from '../mcp/tool-executor.js';
import { executeTool } from '../mcp/tool-executor.js';
import { checkAndIncrementUsage, getPlanLimitsForUser } from '../billing/usage-gate.js';
import { metrics } from '../observability/metrics.js';

export type ProfileToolResolver = (serverId: string, profileSlug: string) => Promise<readonly string[] | undefined>;
export type DefaultProfileToolResolver = (serverId: string) => Promise<readonly string[] | undefined>;

export interface StreamableHTTPDeps {
  readonly logger: Logger;
  readonly registry: ServerRegistry;
  readonly toolLoader: ToolLoader;
  readonly toolExecutorDeps: ToolExecutorDeps;
  readonly redis: Redis;
  readonly resolveProfileToolIds?: ProfileToolResolver;
  readonly resolveDefaultProfileToolIds?: DefaultProfileToolResolver;
}

interface StreamableSession {
  readonly id: string;
  readonly slug: string;
  readonly clientIp: string;
  readonly profileSlug?: string;
  readonly createdAt: number;
}

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_SESSIONS = 500;
const SESSION_CLEANUP_INTERVAL_MS = 60_000;

function jsonRpcSuccess(id: string | number, result: unknown) {
  return Object.freeze({ jsonrpc: '2.0' as const, id, result });
}

function jsonRpcError(id: string | number, code: number, message: string) {
  return Object.freeze({ jsonrpc: '2.0' as const, id, error: Object.freeze({ code, message }) });
}

function resolveServer(registry: ServerRegistry, identifier: string) {
  if (/^[a-f0-9]{12}$/.test(identifier)) {
    return registry.getByEndpointId(identifier) ?? registry.getBySlug(identifier);
  }
  return registry.getBySlug(identifier);
}

// Matches the API validation: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/)
const PROFILE_SLUG_PATTERN = /^[a-z0-9-]+$/;

function isValidProfileSlug(slug: string): boolean {
  return slug.length >= 1 && slug.length <= 50 && PROFILE_SLUG_PATTERN.test(slug);
}

function filterToolsByProfile(
  toolMap: ReadonlyMap<string, ToolDefinition>,
  allowedToolIds?: readonly string[],
): readonly ToolDefinition[] {
  if (!allowedToolIds) return [...toolMap.values()];
  const allowedSet = new Set(allowedToolIds);
  return [...toolMap.values()].filter((tool) => allowedSet.has(tool.id));
}

function toMcpToolDef(tool: ToolDefinition): Record<string, unknown> {
  return {
    name: tool.name,
    description: tool.description ?? '',
    inputSchema: tool.inputSchema,
  };
}

export function createStreamableHTTPRouter(deps: StreamableHTTPDeps): Router {
  const { logger, registry, toolLoader, toolExecutorDeps, resolveProfileToolIds, resolveDefaultProfileToolIds } = deps;
  const router = express.Router();

  const sessions = new Map<string, StreamableSession>();

  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    for (const [id, session] of sessions) {
      if (now - session.createdAt > SESSION_TTL_MS) {
        sessions.delete(id);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      logger.debug({ cleaned }, 'Streamable HTTP stale sessions removed');
    }
  }, SESSION_CLEANUP_INTERVAL_MS);
  cleanupTimer.unref();

  function supportsStreaming(req: Request): boolean {
    const accept = req.headers['accept'] ?? '';
    return accept.includes('text/event-stream');
  }

  function writeSSE(res: Response, event: string, data: unknown): void {
    const safeEvent = event.replace(/[\r\n]/g, '');
    const json = JSON.stringify(data);
    const safeData = json.replace(/\r\n|\r|\n/g, '\ndata: ');
    res.write(`event: ${safeEvent}\ndata: ${safeData}\n\n`);
  }

  const handleRequest = async (req: Request, res: Response, profileSlug?: string) => {
    if (profileSlug && !isValidProfileSlug(profileSlug)) {
      res.status(400).json({ error: 'Invalid profile slug' });
      return;
    }

    // Check server existence before auth — for unknown servers, the token auth middleware
    // passes through without setting serverTokenVerified (there's nothing to verify against).
    const identifier = req.params['identifier']!;
    const server = resolveServer(registry, identifier);

    if (!server || !server.isActive) {
      res.status(404).json({ error: 'Server not found' });
      return;
    }

    const authenticated = (req as unknown as Record<string, unknown>)['serverTokenVerified'] === true;
    if (!authenticated) {
      res.status(401).json({ error: 'Authorization required' });
      return;
    }

    if (server.transport !== 'streamable-http') {
      res.status(400).json({ error: 'This server uses SSE transport. Use GET /mcp/:identifier/sse instead.' });
      return;
    }

    const message = req.body as JsonRpcRequest;
    if (message.jsonrpc !== '2.0' || typeof message.method !== 'string' || !message.method || message.id === undefined) {
      res.status(400).json({ error: 'Invalid JSON-RPC request' });
      return;
    }

    let sessionId = req.headers['mcp-session-id'] as string | undefined;
    let session = sessionId ? sessions.get(sessionId) : undefined;

    if (session && session.slug !== server.slug) {
      res.status(403).json({ error: 'Session does not belong to this server' });
      return;
    }

    if (session && session.clientIp !== 'unknown' && session.clientIp !== (req.ip ?? 'unknown')) {
      logger.warn({ sessionId, expectedIp: session.clientIp, actualIp: req.ip }, 'Session IP mismatch');
      res.status(403).json({ error: 'Session does not belong to this client' });
      return;
    }

    if (session && (session.profileSlug ?? null) !== (profileSlug ?? null)) {
      res.status(403).json({ error: 'Session does not belong to this profile' });
      return;
    }

    let allowedToolIds: readonly string[] | undefined;
    if (profileSlug) {
      if (!resolveProfileToolIds) {
        res.status(500).json({ error: 'Profile resolution unavailable' });
        return;
      }

      try {
        allowedToolIds = await resolveProfileToolIds(server.id, profileSlug);
      } catch (err) {
        logger.error({ err, serverId: server.id, profileSlug }, 'Failed to resolve access profile');
        res.status(500).json({ error: 'Failed to resolve profile' });
        return;
      }

      if (!allowedToolIds) {
        res.status(404).json({ error: 'Profile not found' });
        return;
      }
    } else if (resolveDefaultProfileToolIds) {
      try {
        allowedToolIds = await resolveDefaultProfileToolIds(server.id);
      } catch (err) {
        logger.error({ err, serverId: server.id }, 'Failed to resolve default profile');
        res.status(503).json({ error: 'Failed to resolve access profile' });
        return;
      }
    }

    const allowedToolSet = allowedToolIds ? new Set(allowedToolIds) : undefined;

    try {
      let response;

      switch (message.method) {
        case 'initialize': {
          if (sessions.size >= MAX_SESSIONS) {
            response = jsonRpcError(message.id, -32000, 'Too many active sessions');
            break;
          }
          sessionId = randomUUID();
          session = {
            id: sessionId,
            slug: server.slug,
            profileSlug,
            clientIp: req.ip ?? 'unknown',
            createdAt: Date.now(),
          };
          sessions.set(sessionId, session);

          response = jsonRpcSuccess(message.id, {
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
          break;
        }

        case 'tools/list': {
          const toolMap = await toolLoader.getTools(server.id);
          const tools = filterToolsByProfile(toolMap, allowedToolIds).map(toMcpToolDef);
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

          if (allowedToolSet && !allowedToolSet.has(tool.id)) {
            response = jsonRpcError(message.id, -32002, 'Tool not found');
            break;
          }

          // Usage gate: check plan limits after tool validation, before executing
          const planLimits = await getPlanLimitsForUser(deps.redis, server.userId);
          const usageCheck = await checkAndIncrementUsage(
            { redis: deps.redis, logger },
            server.userId,
            planLimits,
          );

          if (!usageCheck.allowed) {
            logger.warn(
              { userId: server.userId, currentUsage: usageCheck.currentUsage, limit: usageCheck.limit },
              'Usage limit reached',
            );
            response = jsonRpcError(message.id, -32003, 'Usage limit reached. Upgrade your plan.');
            break;
          }

          const toolInput = (params['arguments'] ?? {}) as Readonly<Record<string, unknown>>;
          const context = { requestId: randomUUID(), sessionId: sessionId ?? 'anonymous' };

          metrics.incrementCounter('total_tool_calls');
          const start = performance.now();

          const streaming = supportsStreaming(req);

          if (streaming) {
            // Stream the response as SSE for long-running tool calls
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            if (sessionId) {
              res.setHeader('Mcp-Session-Id', sessionId);
            }
            res.flushHeaders();

            writeSSE(res, 'progress', { jsonrpc: '2.0', id: message.id, progress: 'executing' });

            try {
              const result: MCPToolResult = await executeTool(
                toolExecutorDeps,
                server,
                tool,
                toolInput,
                context,
              );
              metrics.observeHistogram('tool_call_duration_ms', Math.round(performance.now() - start));
              writeSSE(res, 'message', jsonRpcSuccess(message.id, result));
            } catch (err) {
              metrics.incrementCounter('tool_call_errors');
              metrics.observeHistogram('tool_call_duration_ms', Math.round(performance.now() - start));
              logger.error({ err, tool: toolName, slug: server.slug }, 'Tool execution error (streaming)');
              writeSSE(res, 'message', jsonRpcError(message.id, -32603, 'Tool execution failed'));
            }

            res.end();
            return;
          }

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
            logger.error({ err, tool: toolName, slug: server.slug }, 'Tool execution error');
            response = jsonRpcError(message.id, -32603, 'Tool execution failed');
          }
          break;
        }

        case 'resources/list': {
          try {
            const pattern = `webhook:latest:${server.id}:*`;
            const prefix = `webhook:latest:${server.id}:`;
            const keys = await scanRedisKeys(deps.redis, pattern);

            const resources = keys
              .map((key) => key.slice(prefix.length))
              .filter((name) => name.length > 0 && /^[a-zA-Z0-9_.:-]+$/.test(name))
              .map((eventName) => ({
                uri: `webhook://${server.slug}/${eventName}`,
                name: eventName,
                description: `Latest ${eventName} webhook event`,
                mimeType: 'application/json',
              }));

            response = jsonRpcSuccess(message.id, { resources });
          } catch (err) {
            logger.error({ err, slug: server.slug }, 'Failed to list resources');
            response = jsonRpcError(message.id, -32603, 'Failed to list resources');
          }
          break;
        }

        case 'resources/read': {
          const params = message.params ?? {};
          const uri = params['uri'];
          if (typeof uri !== 'string') {
            response = jsonRpcError(message.id, -32602, 'Missing resource URI');
            break;
          }

          const uriMatch = uri.match(/^webhook:\/\/([^/]+)\/(.+)$/);
          if (!uriMatch) {
            response = jsonRpcError(message.id, -32602, 'Invalid resource URI');
            break;
          }
          const uriHost = uriMatch[1]!;
          const eventName = uriMatch[2]!;
          if (uriHost !== server.slug) {
            response = jsonRpcError(message.id, -32602, 'Resource URI does not match this server');
            break;
          }

          if (!/^[a-zA-Z0-9_.:-]+$/.test(eventName) || eventName.length > 200) {
            response = jsonRpcError(message.id, -32602, 'Invalid event name in resource URI');
            break;
          }

          try {
            const redisKey = `webhook:latest:${server.id}:${eventName}`;
            const data = await deps.redis.get(redisKey);

            if (!data) {
              response = jsonRpcError(message.id, -32002, 'Resource not found');
              break;
            }

            response = jsonRpcSuccess(message.id, {
              contents: [{
                uri,
                mimeType: 'application/json',
                text: data,
              }],
            });
          } catch (err) {
            logger.error({ err, slug: server.slug, uri }, 'Failed to read resource');
            response = jsonRpcError(message.id, -32603, 'Failed to read resource');
          }
          break;
        }

        case 'ping':
          response = jsonRpcSuccess(message.id, { pong: true });
          break;

        default:
          response = jsonRpcError(message.id, -32601, 'Method not found');
      }

      if (sessionId) {
        res.setHeader('Mcp-Session-Id', sessionId);
      }

      res.json(response);
    } catch (err) {
      logger.error({ err, slug: server.slug }, 'Streamable HTTP error');
      res.status(500).json(jsonRpcError(message.id, -32603, 'Internal error'));
    }
  };

  router.post('/mcp/:identifier', async (req: Request, res: Response) => {
    await handleRequest(req, res);
  });

  router.post('/mcp/:identifier/profiles/:profileSlug', async (req: Request, res: Response) => {
    await handleRequest(req, res, req.params['profileSlug']!);
  });

  return router;
}

async function scanRedisKeys(redis: Redis, pattern: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor = '0';
  do {
    const [nextCursor, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    keys.push(...batch);
    cursor = nextCursor;
  } while (cursor !== '0');
  return keys;
}
