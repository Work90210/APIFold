import type { Request, Response, Router } from 'express';
import express from 'express';

import type { ProtocolHandler, JsonRpcRequest } from '../mcp/protocol-handler.js';
import type { SessionManager } from '../mcp/session-manager.js';
import type { Logger } from '../observability/logger.js';
import type { ServerRegistry } from '../registry/server-registry.js';

export interface SSETransportDeps {
  readonly logger: Logger;
  readonly sessionManager: SessionManager;
  readonly protocolHandler: ProtocolHandler;
  readonly registry: ServerRegistry;
  readonly maxConnectionsPerWorker?: number;
}

export function createSSETransportRouter(deps: SSETransportDeps): Router {
  const { logger, sessionManager, protocolHandler, registry } = deps;
  const maxConns = deps.maxConnectionsPerWorker ?? 100;
  const router = express.Router();

  // SSE endpoint — persistent connection
  router.get('/mcp/:slug/sse', (req: Request, res: Response) => {
    const slug = req.params['slug']!;
    const server = registry.getBySlug(slug);

    if (!server || !server.isActive) {
      res.status(404).json({ error: 'Server not found' });
      return;
    }

    if (server.transport !== 'sse') {
      res.status(400).json({ error: 'This server uses streamable-http transport. Use POST /mcp/:slug instead.' });
      return;
    }

    // Backpressure: worker-level connection cap
    if (sessionManager.size >= maxConns) {
      res.status(503).json({ error: 'Worker at connection capacity' });
      return;
    }

    if (!sessionManager.hasCapacity()) {
      res.status(503).json({ error: 'Too many active sessions' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const session = sessionManager.create(slug, res);
    if (!session) {
      // Race: capacity filled between check and create
      res.status(503).json({ error: 'Too many active sessions' });
      return;
    }

    sessionManager.sendEvent(
      session,
      'endpoint',
      JSON.stringify({ sessionId: session.id, url: `/mcp/${slug}/message` }),
    );

    logger.info({ sessionId: session.id, slug }, 'SSE session established');
  });

  // Message endpoint — receives JSON-RPC from agents via SSE session
  router.post('/mcp/:slug/message', async (req: Request, res: Response) => {
    const sessionId = req.headers['x-session-id'] as string | undefined;
    if (!sessionId) {
      res.status(400).json({ error: 'Missing X-Session-ID header' });
      return;
    }

    const session = sessionManager.get(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const slug = req.params['slug']!;
    if (session.slug !== slug) {
      res.status(403).json({ error: 'Session does not belong to this server' });
      return;
    }

    const message = req.body as JsonRpcRequest;
    if (message.jsonrpc !== '2.0' || typeof message.method !== 'string' || !message.method || message.id === undefined) {
      res.status(400).json({ error: 'Invalid JSON-RPC request' });
      return;
    }

    try {
      await protocolHandler.handleMessage(session, message);
      res.status(202).json({ ok: true });
    } catch (err) {
      logger.error({ err, sessionId }, 'Message handling error');
      res.status(500).json({ error: 'Internal error' });
    }
  });

  return router;
}
