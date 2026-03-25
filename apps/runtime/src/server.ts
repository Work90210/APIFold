import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Redis } from 'ioredis';

import type { RuntimeConfig } from './config.js';
import type { ProtocolHandler } from './mcp/protocol-handler.js';
import type { SessionManager } from './mcp/session-manager.js';
import type { ToolExecutorDeps } from './mcp/tool-executor.js';
import { createCorsMiddleware } from './middleware/cors.js';
import { createErrorHandler } from './middleware/error-handler.js';
import { createPerServerRateLimiter } from './middleware/rate-limiter.js';
import { createRequestLogger } from './middleware/request-logger.js';
import { createServerTokenAuth, type TokenUpgradeCallback } from './middleware/server-token-auth.js';
import { createServiceAuth } from './middleware/service-auth.js';
import type { DbClient } from './sync/postgres-loader.js';
import { createHealthRouter } from './observability/health.js';
import type { Logger } from './observability/logger.js';
import { metrics } from './observability/metrics.js';
import type { ServerRegistry } from './registry/server-registry.js';
import type { ToolLoader } from './registry/tool-loader.js';
import { createDomainRouter } from './transports/domain-router.js';
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
  readonly db?: DbClient;
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
  app.get('/metrics', createServiceAuth(config.runtimeSecret), (_req, res) => {
    res.type('text/plain; version=0.0.4').send(metrics.toPrometheus());
  });

  // Custom domain routing MUST run BEFORE token auth so the URL is rewritten
  // from /sse → /mcp/:endpointId/sse before the auth middleware resolves the server.
  app.use(createDomainRouter({
    logger,
    registry,
    platformDomain: process.env['PLATFORM_DOMAIN'] ?? 'apifold.dev',
  }));

  // Per-server access token auth + global API key fallback for MCP endpoints
  // Auto-upgrades legacy SHA-256 token hashes to scrypt on successful auth
  const onTokenUpgrade: TokenUpgradeCallback | undefined = deps.db
    ? (serverId, oldTokenHash, newTokenHash) => {
        // Compare-and-swap: only update if the hash hasn't already been upgraded
        // by another worker or concurrent request. This prevents the race where
        // two requests both upgrade with different salts and one overwrites the other.
        deps.db!.query(
          'UPDATE mcp_servers SET token_hash = $1, updated_at = NOW() WHERE id = $2 AND token_hash = $3',
          [newTokenHash, serverId, oldTokenHash],
        ).then((result) => {
          // rowCount check: if 0 rows affected, another request already upgraded it
          const rows = (result as unknown as { rowCount?: number }).rowCount ?? 1;
          if (rows > 0) {
            logger.info({ serverId }, 'Auto-upgraded token hash from SHA-256 to scrypt');
            const existing = registry.getById(serverId);
            if (existing) {
              registry.upsert({ ...existing, tokenHash: newTokenHash });
            }
          }
        }).catch((err) => {
          logger.warn({ serverId, err }, 'Failed to auto-upgrade token hash');
        });
      }
    : undefined;
  app.use('/mcp/:slug', createServerTokenAuth(config.mcpApiKey, registry, onTokenUpgrade));

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

  // Custom domain routing — rewrites /sse → /mcp/:endpointId/sse for custom domain requests
  app.use(createDomainRouter({
    logger,
    registry,
    platformDomain: process.env['PLATFORM_DOMAIN'] ?? 'apifold.dev',
  }));

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
  const serviceAuth = createServiceAuth(config.runtimeSecret);
  app.post('/internal/sync', serviceAuth, (_req, res) => {
    logger.info('Internal sync received');
    res.json({ ok: true });
  });

  // Error handler (must be last)
  app.use(createErrorHandler(logger));

  return app;
}
