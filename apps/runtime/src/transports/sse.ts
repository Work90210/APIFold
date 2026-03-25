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

function sanitizeIdentifier(identifier: string): string {
  // Normalize identifier for safe reflection in responses (SSE/JSON).
  // Keep alphanumerics, underscore and dash; replace everything else with '-'.
  return identifier.trim().replace(/[^a-zA-Z0-9_-]/g, '-');
}

export function createSSETransportRouter(deps: SSETransportDeps): Router {
  const { logger, sessionManager, protocolHandler, registry } = deps;
  const maxConns = deps.maxConnectionsPerWorker ?? 100;
  const router = express.Router();

  // SSE endpoint — routes by endpoint ID (12 hex chars) with slug fallback
  router.get('/mcp/:identifier/sse', (req: Request, res: Response) => {
    const identifier = req.params['identifier']!;

    // Try endpoint ID first (12 hex chars), then fall back to slug
    const server = /^[a-f0-9]{12}$/.test(identifier)
      ? registry.getByEndpointId(identifier)
      : registry.getBySlug(identifier);

    if (!server || !server.isActive) {
      res.status(404).json({ error: 'Server not found' });
      return;
    }

    if (server.transport !== 'sse') {
      res.status(400).json({ error: 'This server uses streamable-http transport. Use POST /mcp/:identifier instead.' });
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

    const authenticated = (req as unknown as Record<string, unknown>)['serverTokenVerified'] === true;
    const session = sessionManager.create(server.slug, res, req.ip ?? 'unknown', authenticated);
    if (!session) {
      // Race: capacity filled between check and create
      res.status(503).json({ error: 'Too many active sessions' });
      return;
    }

    res.flushHeaders();

    sessionManager.sendEvent(
      session,
      'endpoint',
      JSON.stringify({
        sessionId: session.id,
        url: `/mcp/${sanitizeIdentifier(identifier)}/message`,
      }),
    );

    logger.info({ sessionId: session.id, endpointId: server.endpointId, slug: server.slug }, 'SSE session established');
  });

  // Message endpoint — receives JSON-RPC from agents via SSE session
  router.post('/mcp/:identifier/message', async (req: Request, res: Response) => {
    const identifier = req.params['identifier']!;

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

    // Session was authenticated at SSE connect time — trust it for message POSTs.
    // This avoids requiring the token on every POST (cleaner for SSE clients).
    if (!session.authenticated) {
      res.status(401).json({ error: 'Session is not authenticated' });
      return;
    }

    if (session.slug !== identifier && session.slug !== (registry.getByEndpointId(identifier)?.slug)) {
      res.status(403).json({ error: 'Session does not belong to this server' });
      return;
    }

    // Bind session to originating client IP to prevent hijacking
    if (session.clientIp !== 'unknown' && session.clientIp !== (req.ip ?? 'unknown')) {
      logger.warn({ sessionId, expectedIp: session.clientIp, actualIp: req.ip }, 'Session IP mismatch');
      res.status(403).json({ error: 'Session does not belong to this client' });
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
