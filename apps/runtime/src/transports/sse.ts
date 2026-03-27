import type { Request, Response, Router } from 'express';
import express from 'express';

import type { ProtocolHandler, JsonRpcRequest } from '../mcp/protocol-handler.js';
import type { SessionManager } from '../mcp/session-manager.js';
import type { Logger } from '../observability/logger.js';
import type { ServerRegistry } from '../registry/server-registry.js';

export type ProfileToolResolver = (serverId: string, profileSlug: string) => Promise<readonly string[] | undefined>;

export interface SSETransportDeps {
  readonly logger: Logger;
  readonly sessionManager: SessionManager;
  readonly protocolHandler: ProtocolHandler;
  readonly registry: ServerRegistry;
  readonly maxConnectionsPerWorker?: number;
  readonly resolveProfileToolIds?: ProfileToolResolver;
}

function sanitizeIdentifier(identifier: string): string {
  return identifier.trim().replace(/[^a-zA-Z0-9_-]/g, '-');
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

function buildMessageUrl(identifier: string, profileSlug?: string): string {
  const base = `/mcp/${sanitizeIdentifier(identifier)}`;
  return profileSlug
    ? `${base}/profiles/${encodeURIComponent(profileSlug)}/message`
    : `${base}/message`;
}

export function createSSETransportRouter(deps: SSETransportDeps): Router {
  const { logger, sessionManager, protocolHandler, registry, resolveProfileToolIds } = deps;
  const maxConns = deps.maxConnectionsPerWorker ?? 100;
  const router = express.Router();

  const establishSession = async (req: Request, res: Response, profileSlug?: string) => {
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

    if (server.transport !== 'sse') {
      res.status(400).json({ error: 'This server uses streamable-http transport. Use POST /mcp/:identifier instead.' });
      return;
    }

    if (sessionManager.size >= maxConns) {
      res.status(503).json({ error: 'Worker at connection capacity' });
      return;
    }

    if (!sessionManager.hasCapacity()) {
      res.status(503).json({ error: 'Too many active sessions' });
      return;
    }

    let profileContext: { readonly slug: string; readonly toolIds: readonly string[] } | undefined;
    if (profileSlug) {
      if (!resolveProfileToolIds) {
        res.status(500).json({ error: 'Profile resolution unavailable' });
        return;
      }

      try {
        const toolIds = await resolveProfileToolIds(server.id, profileSlug);
        if (!toolIds) {
          res.status(404).json({ error: 'Profile not found' });
          return;
        }
        profileContext = { slug: profileSlug, toolIds };
      } catch (err) {
        logger.error({ err, serverId: server.id, profileSlug }, 'Failed to resolve access profile');
        res.status(500).json({ error: 'Failed to resolve profile' });
        return;
      }
    }

    const session = sessionManager.create(server.slug, res, req.ip ?? 'unknown', true, profileContext);
    if (!session) {
      res.status(503).json({ error: 'Too many active sessions' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    sessionManager.sendEvent(
      session,
      'endpoint',
      JSON.stringify({
        sessionId: session.id,
        url: buildMessageUrl(identifier, profileSlug),
      }),
    );

    logger.info(
      { sessionId: session.id, endpointId: server.endpointId, slug: server.slug, profileSlug },
      'SSE session established',
    );
  };

  router.get('/mcp/:identifier/sse', (req: Request, res: Response) => {
    void establishSession(req, res);
  });

  router.get('/mcp/:identifier/profiles/:profileSlug/sse', (req: Request, res: Response) => {
    void establishSession(req, res, req.params['profileSlug']!);
  });

  const handleMessage = async (req: Request, res: Response, routeProfileSlug?: string) => {
    if (routeProfileSlug && !isValidProfileSlug(routeProfileSlug)) {
      res.status(400).json({ error: 'Invalid profile slug' });
      return;
    }

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

    if (!session.authenticated) {
      res.status(401).json({ error: 'Session is not authenticated' });
      return;
    }

    const server = resolveServer(registry, identifier);
    if (!server || !server.isActive || session.slug !== server.slug) {
      res.status(403).json({ error: 'Session does not belong to this server' });
      return;
    }

    if (session.clientIp !== 'unknown' && session.clientIp !== (req.ip ?? 'unknown')) {
      logger.warn({ sessionId, expectedIp: session.clientIp, actualIp: req.ip }, 'Session IP mismatch');
      res.status(403).json({ error: 'Session does not belong to this client' });
      return;
    }

    if ((session.profileSlug ?? null) !== (routeProfileSlug ?? null)) {
      res.status(403).json({ error: 'Session does not belong to this profile' });
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
  };

  router.post('/mcp/:identifier/message', async (req: Request, res: Response) => {
    await handleMessage(req, res);
  });

  router.post('/mcp/:identifier/profiles/:profileSlug/message', async (req: Request, res: Response) => {
    await handleMessage(req, res, req.params['profileSlug']!);
  });

  return router;
}
