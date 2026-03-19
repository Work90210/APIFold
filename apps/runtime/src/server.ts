import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Redis } from 'ioredis';

import type { RuntimeConfig } from './config.js';
import type { ProtocolHandler, JsonRpcRequest } from './mcp/protocol-handler.js';
import type { SessionManager } from './mcp/session-manager.js';
import { createCorsMiddleware } from './middleware/cors.js';
import { createErrorHandler } from './middleware/error-handler.js';
import { createPerServerRateLimiter } from './middleware/rate-limiter.js';
import { createRequestLogger } from './middleware/request-logger.js';
import { createServiceAuth } from './middleware/service-auth.js';
import { createHealthRouter } from './observability/health.js';
import type { Logger } from './observability/logger.js';
import { registerMetricsEndpoint } from './registry/cache-metrics.js';
import type { ServerRegistry } from './registry/server-registry.js';

export interface AppDeps {
  readonly config: RuntimeConfig;
  readonly logger: Logger;
  readonly sessionManager: SessionManager;
  readonly protocolHandler: ProtocolHandler;
  readonly registry: ServerRegistry;
  readonly redis: Redis | null;
  readonly isReady: () => boolean;
}

export function createApp(deps: AppDeps): Express {
  const { config, logger, sessionManager, protocolHandler, registry } = deps;

  const app = express();

  // Core middleware
  app.use(helmet());
  app.use(createCorsMiddleware(config));
  app.use(express.json({ limit: '100kb' }));
  app.use(createRequestLogger(logger));

  // Health + metrics (no auth required)
  app.use(createHealthRouter({ isReady: deps.isReady, logger }));
  registerMetricsEndpoint(app);

  // Per-server rate limiter (Redis-backed, fail-open)
  if (deps.redis) {
    app.use(
      '/mcp/:slug',
      createPerServerRateLimiter({
        redis: deps.redis,
        logger,
        windowMs: config.globalRateLimitWindowMs,
        defaultMax: config.globalRateLimitMax,
      }),
    );
  }

  // SSE endpoint — public (agents connect here)
  app.get('/mcp/:slug/sse', (req, res) => {
    const slug = req.params['slug']!;
    const server = registry.getBySlug(slug);

    if (!server || !server.isActive) {
      res.status(404).json({ error: 'Server not found' });
      return;
    }

    // Check capacity BEFORE flushing headers (cannot set status after flush)
    if (!sessionManager.hasCapacity()) {
      res.status(503).json({ error: 'Too many active sessions' });
      return;
    }

    // Set SSE headers and commit
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const session = sessionManager.create(slug, res)!;

    // Send session endpoint info
    sessionManager.sendEvent(
      session,
      'endpoint',
      JSON.stringify({ sessionId: session.id, url: `/mcp/${slug}/message` }),
    );

    logger.info({ sessionId: session.id, slug }, 'SSE session established');
  });

  // Message endpoint — receives JSON-RPC from agents
  app.post('/mcp/:slug/message', async (req, res) => {
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

    // Verify session belongs to this slug (prevent cross-server session hijacking)
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

  // Internal sync endpoint — protected by service auth
  const internalRouter = express.Router();
  internalRouter.use(createServiceAuth(config.runtimeSecret));

  internalRouter.post('/internal/sync', (_req, res) => {
    logger.info('Internal sync received');
    res.json({ ok: true });
  });

  app.use(internalRouter);

  // Error handler (must be last)
  app.use(createErrorHandler(logger));

  return app;
}
