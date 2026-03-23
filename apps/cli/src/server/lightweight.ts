import { randomUUID } from 'node:crypto';
import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createLogger } from '@apifold/logger';
import type { MCPToolDefinition } from '@apifold/transformer';
import type { CliConfig } from '../config/schema.js';
import { proxyToolCall } from './proxy.js';

interface JsonRpcRequest {
  readonly jsonrpc: '2.0';
  readonly id: string | number;
  readonly method: string;
  readonly params?: Readonly<Record<string, unknown>>;
}

interface SseSession {
  readonly id: string;
  readonly res: Response;
  readonly createdAt: number;
}

const SERVER_NAME = 'apifold-cli';
const SERVER_VERSION = '0.0.1';
const PROTOCOL_VERSION = '2024-11-05';

function jsonRpcSuccess(id: string | number, result: unknown) {
  return Object.freeze({ jsonrpc: '2.0' as const, id, result });
}

function jsonRpcError(id: string | number, code: number, message: string) {
  return Object.freeze({ jsonrpc: '2.0' as const, id, error: Object.freeze({ code, message }) });
}

function isValidJsonRpc(body: unknown): body is JsonRpcRequest {
  const msg = body as Record<string, unknown>;
  return (
    msg?.jsonrpc === '2.0' &&
    typeof msg.method === 'string' &&
    msg.method.length > 0 &&
    msg.id !== undefined
  );
}

export async function startServer(
  config: CliConfig,
  tools: readonly MCPToolDefinition[],
): Promise<void> {
  const logger = createLogger({ name: 'apifold-cli' });
  const toolMap = new Map(tools.map((t) => [t.name, t]));

  const app = express();
  app.use(helmet());
  // Restrict CORS to same-origin — the CLI server proxies upstream API calls with
  // user credentials, so open CORS would let any web page trigger tool calls.
  app.use(cors({ origin: false }));
  app.use(express.json({ limit: '1mb' }));

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', tools: tools.length, transport: config.transport });
  });

  if (config.transport === 'sse') {
    setupSseTransport(app, config, toolMap, logger);
  } else {
    setupStreamableHttpTransport(app, config, toolMap, logger);
  }

  return new Promise<void>((resolve, reject) => {
    // Bind to localhost only — prevents exposure to the local network.
    // MCP clients connect from the same machine.
    const server = app.listen(config.port, '127.0.0.1', () => {
      logger.info(
        { port: config.port, transport: config.transport, tools: tools.length },
        'MCP server started',
      );
      resolve();
    });

    server.on('error', reject);

    const shutdown = () => {
      logger.info('Shutting down...');
      server.close(() => process.exit(0));
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  });
}

function setupSseTransport(
  app: ReturnType<typeof express>,
  config: CliConfig,
  toolMap: ReadonlyMap<string, MCPToolDefinition>,
  logger: ReturnType<typeof createLogger>,
): void {
  let session: SseSession | null = null;

  app.get('/sse', (_req: Request, res: Response) => {
    if (session) {
      res.status(409).json({ error: 'A session is already active. Disconnect first.' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const id = randomUUID();
    session = { id, res, createdAt: Date.now() };

    const endpointPayload = JSON.stringify({ sessionId: id, url: '/message' });
    res.write(`event: endpoint\ndata: ${endpointPayload}\n\n`);

    logger.info({ sessionId: id }, 'SSE session established');

    res.on('close', () => {
      if (session?.id === id) {
        session = null;
      }
      logger.info({ sessionId: id }, 'SSE session closed');
    });
  });

  app.post('/message', async (req: Request, res: Response) => {
    const callerSessionId = req.headers['x-session-id'] as string | undefined;
    if (!session || session.id !== callerSessionId) {
      res.status(401).json({ error: 'Invalid or missing session' });
      return;
    }

    if (!isValidJsonRpc(req.body)) {
      res.status(400).json({ error: 'Invalid JSON-RPC request' });
      return;
    }

    const response = await handleJsonRpc(req.body, config, toolMap, logger);

    session.res.write(`event: message\ndata: ${JSON.stringify(response)}\n\n`);
    res.status(202).json({ ok: true });
  });
}

function setupStreamableHttpTransport(
  app: ReturnType<typeof express>,
  config: CliConfig,
  toolMap: ReadonlyMap<string, MCPToolDefinition>,
  logger: ReturnType<typeof createLogger>,
): void {
  app.post('/mcp', async (req: Request, res: Response) => {
    if (!isValidJsonRpc(req.body)) {
      res.status(400).json({ error: 'Invalid JSON-RPC request' });
      return;
    }

    const message = req.body;

    if (message.method === 'initialize') {
      const newSessionId = randomUUID();
      const response = jsonRpcSuccess(message.id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      });
      res.setHeader('Mcp-Session-Id', newSessionId);
      res.json(response);
      return;
    }

    const response = await handleJsonRpc(message, config, toolMap, logger);
    res.json(response);
  });
}

async function handleJsonRpc(
  message: JsonRpcRequest,
  config: CliConfig,
  toolMap: ReadonlyMap<string, MCPToolDefinition>,
  logger: ReturnType<typeof createLogger>,
): Promise<Readonly<Record<string, unknown>>> {
  switch (message.method) {
    case 'initialize':
      return jsonRpcSuccess(message.id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      });

    case 'tools/list':
      return jsonRpcSuccess(message.id, {
        tools: [...toolMap.values()].map((t) => ({
          name: t.name,
          description: t.description ?? '',
          inputSchema: t.inputSchema,
        })),
      });

    case 'tools/call': {
      const params = message.params ?? {};
      const toolName = params['name'];
      if (typeof toolName !== 'string') {
        return jsonRpcError(message.id, -32602, 'Missing tool name');
      }

      const tool = toolMap.get(toolName);
      if (!tool) {
        return jsonRpcError(message.id, -32002, `Tool not found: ${toolName}`);
      }

      const toolArgs = (params['arguments'] ?? {}) as Readonly<Record<string, unknown>>;

      try {
        const result = await proxyToolCall(tool, toolArgs, config);

        if (result.status >= 400) {
          return jsonRpcSuccess(message.id, {
            content: [{ type: 'text', text: JSON.stringify(result.body, null, 2) }],
            isError: true,
          });
        }

        return jsonRpcSuccess(message.id, {
          content: [{ type: 'text', text: JSON.stringify(result.body, null, 2) }],
        });
      } catch (err) {
        const error = err as Error;
        logger.error({ err: error, tool: toolName }, 'Tool execution failed');
        return jsonRpcError(message.id, -32603, 'Tool execution failed');
      }
    }

    case 'ping':
      return jsonRpcSuccess(message.id, { pong: true });

    default:
      return jsonRpcError(message.id, -32601, `Method not found: ${message.method}`);
  }
}
