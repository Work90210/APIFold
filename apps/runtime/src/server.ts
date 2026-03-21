import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Redis } from 'ioredis';

import type { RuntimeConfig } from './config.js';
import type { ProtocolHandler } from './mcp/protocol-handler.js';
import type { SessionManager } from './mcp/session-manager.js';
import type { ToolExecutorDeps } from './mcp/tool-executor.js';
import { createCorsMiddleware } from './middleware/cors.js';
import { createErrorHandler } from './middleware/error-handler.js';
import { createMcpAuth } from './middleware/mcp-auth.js';
import { createPerServerRateLimiter } from './middleware/rate-limiter.js';
import { createRequestLogger } from './middleware/request-logger.js';
import { createServiceAuth } from './middleware/service-auth.js';
import { createHealthRouter } from './observability/health.js';
import type { Logger } from './observability/logger.js';
import { registerMetricsEndpoint } from './registry/cache-metrics.js';
import type { ServerRegistry } from './registry/server-registry.js';
import type { ToolLoader } from './registry/tool-loader.js';
import { createSSETransportRouter } from './transports/sse.js';
import { createStreamableHTTPRouter } from './transports/streamable-http.js';

export interface AppDeps {
  readonly config: RuntimeConfig;
  readonly logger: Logger;
  readonly sessionManager: SessionManager;
  readonly protocolHandler: ProtocolHandler;
  readonly registry: ServerRegistry;
  readonly redis: Redis | null;
  readonly isReady: () => boolean;
  readonly toolLoader?: ToolLoader;
  readonly toolExecutorDeps?: ToolExecutorDeps;
}

export function createApp(deps: AppDeps): Express {
  const { config, logger, sessionManager, protocolHandler, registry } = deps;

  const app = express();

  // Core middleware
  app.use(helmet());
  app.use(createCorsMiddleware(config));
  app.use(express.json({ limit: '100kb' }));
  app.use(createRequestLogger(logger));

  // Health (no auth required)
  app.use(createHealthRouter({ isReady: deps.isReady, logger }));

  // Metrics — behind service auth to prevent information disclosure
  const metricsRouter = express.Router();
  metricsRouter.use(createServiceAuth(config.runtimeSecret));
  registerMetricsEndpoint(metricsRouter);
  app.use(metricsRouter);

  // Optional API key auth for MCP endpoints (no-op when MCP_API_KEY is not set)
  app.use('/mcp/:slug', createMcpAuth(config.mcpApiKey));

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

  // Transport routers — SSE and Streamable HTTP
  app.use(createSSETransportRouter({
    logger,
    sessionManager,
    protocolHandler,
    registry,
    maxConnectionsPerWorker: config.maxConnectionsPerWorker,
  }));

  if (deps.toolLoader && deps.toolExecutorDeps) {
    app.use(createStreamableHTTPRouter({
      logger,
      registry,
      toolLoader: deps.toolLoader,
      toolExecutorDeps: deps.toolExecutorDeps,
    }));
  }

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
