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
import { createWebhookRouter } from './webhooks/receiver.js';
import { WebhookNotifier } from './webhooks/notifier.js';

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

interface AccessProfileRow {
  readonly tool_ids: readonly string[] | null;
}

export function createApp(deps: AppDeps): Express {
  const { config, logger, sessionManager, protocolHandler, registry } = deps;

  const resolveProfileToolIds = deps.db
    ? async (serverId: string, profileSlug: string): Promise<readonly string[] | undefined> => {
        const result = await deps.db!.query<AccessProfileRow>(
          'SELECT tool_ids FROM access_profiles WHERE server_id = $1 AND slug = $2',
          [serverId, profileSlug],
        );
        const row = result.rows[0];
        return row ? (row.tool_ids ?? []) : undefined;
      }
    : undefined;

  const resolveDefaultProfileToolIds = deps.db
    ? async (serverId: string): Promise<readonly string[] | undefined> => {
        const result = await deps.db!.query<AccessProfileRow>(
          'SELECT tool_ids FROM access_profiles WHERE server_id = $1 AND is_default = true LIMIT 1',
          [serverId],
        );
        const row = result.rows[0];
        return row ? (row.tool_ids ?? []) : undefined;
      }
    : undefined;

  const app = express();

  // Trust the first reverse proxy (nginx) so req.ip returns the real client IP
  // from X-Forwarded-For / X-Real-IP headers. Without this, all requests behind
  // nginx appear from the same container IP, breaking rate limiting and IP binding.
  app.set('trust proxy', 1);

  // Core middleware
  app.use(helmet());
  app.use(createCorsMiddleware(config));
  // Capture raw body bytes for webhook signature validation. Providers sign
  // the exact wire bytes — re-serializing via JSON.stringify changes key order.
  app.use(express.json({
    limit: '256kb',
    verify: (req, _res, buf) => {
      (req as unknown as { rawBody?: Buffer }).rawBody = buf;
    },
  }));
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

  // Transport routers — SSE and Streamable HTTP
  app.use(createSSETransportRouter({
    logger,
    sessionManager,
    protocolHandler,
    registry,
    maxConnectionsPerWorker: config.maxConnectionsPerWorker,
    resolveProfileToolIds,
    resolveDefaultProfileToolIds,
  }));

  if (deps.toolLoader && deps.toolExecutorDeps && deps.redis) {
    app.use(createStreamableHTTPRouter({
      logger,
      registry,
      toolLoader: deps.toolLoader,
      toolExecutorDeps: deps.toolExecutorDeps,
      redis: deps.redis,
      resolveProfileToolIds,
      resolveDefaultProfileToolIds,
    }));
  }

  // TODO: Mount composite router when composite registry bootstrap is wired.
  // SECURITY: When mounting createCompositeRouter, MUST register a dedicated
  // auth middleware on '/mcp/composite/:identifier' — the existing '/mcp/:slug'
  // auth middleware does NOT cover composite routes. Also register rate limiting
  // on the same path prefix.

  // Webhook receiver — accepts incoming webhook events
  // Rate-limited to prevent storage exhaustion (webhooks are unauthenticated by design)
  if (deps.redis) {
    app.use(
      '/webhooks/:slug',
      createPerServerRateLimiter({
        redis: deps.redis,
        logger,
        windowMs: 60_000,
        defaultMax: 120,
      }),
    );

    const notifier = new WebhookNotifier({ logger, sessionManager });
    app.use(createWebhookRouter({
      logger,
      registry,
      redis: deps.redis,
      db: deps.db,
      notifier,
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
