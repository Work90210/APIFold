import { Redis } from 'ioredis';
import postgres from 'postgres';

import { loadConfig } from './config.js';
import { ProtocolHandler } from './mcp/protocol-handler.js';
import { SessionManager } from './mcp/session-manager.js';
import { createLogger } from './observability/logger.js';
import { CredentialCache } from './registry/credential-cache.js';
import { ServerRegistry } from './registry/server-registry.js';
import { ToolLoader } from './registry/tool-loader.js';
import { CircuitBreaker } from './resilience/circuit-breaker.js';
import { ConnectionMonitor } from './resilience/connection-monitor.js';
import { createApp } from './server.js';
import { FallbackPoller } from './sync/fallback-poller.js';
import { loadAllServers, fetchToolsForServer, fetchCredentialHeaders } from './sync/postgres-loader.js';
import type { DbClient } from './sync/postgres-loader.js';
import { RedisSubscriber } from './sync/redis-subscriber.js';
import { decrypt } from './vault/decrypt.js';
import { clearKeyCache } from './vault/derive-key.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config);

  logger.info('Starting MCP Runtime...');

  // Database connection (raw postgres.js for direct SQL)
  const sql = postgres(config.databaseUrl, {
    max: config.databasePoolMax,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  const db: DbClient = {
    async query<T>(queryStr: string, params?: readonly unknown[]): Promise<{ readonly rows: readonly T[] }> {
      // All queries MUST use $1/$2 parameterization. The queryStr is always a
      // compile-time constant from postgres-loader.ts — never user input.
      const result = await sql.unsafe(queryStr, (params ?? []) as never[]);
      return { rows: result as unknown as readonly T[] };
    },
  };

  // Redis connections (separate for subscriber — ioredis requirement)
  const redis = new Redis(config.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 3 });
  const redisSub = new Redis(config.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 3 });

  // Vault decrypt function
  const decryptFn = (ciphertext: string): string =>
    decrypt(ciphertext, config.vaultSecret, config.vaultSalt);

  // Registry tiers
  const registry = new ServerRegistry({ logger });
  const toolLoader = new ToolLoader({
    logger,
    fetchTools: (serverId) => fetchToolsForServer(db, serverId),
  });
  const credentialCache = new CredentialCache({
    logger,
    fetchHeaders: (serverId) => fetchCredentialHeaders(db, serverId, decryptFn),
    ttlMs: config.credentialTtlMs,
  });

  // Resilience
  const circuitBreaker = new CircuitBreaker({
    config: {
      failureThreshold: config.circuitBreakerThreshold,
      cooldownMs: config.circuitBreakerCooldownMs,
      halfOpenMaxProbes: 2,
    },
    logger,
  });
  const connectionMonitor = new ConnectionMonitor(logger);

  // Session management
  const sessionManager = new SessionManager({
    logger,
    connectionMonitor,
    maxSessions: config.maxSseSessions,
    heartbeatIntervalMs: config.sseHeartbeatIntervalMs,
    idleTimeoutMs: config.sseIdleTimeoutMs,
  });

  // Protocol handler
  const protocolHandler = new ProtocolHandler({
    logger,
    registry,
    toolLoader,
    sessionManager,
    toolExecutorDeps: {
      logger,
      circuitBreaker,
      authInjector: { credentialCache },
      timeoutMs: config.upstreamTimeoutMs,
    },
  });

  // Ready state
  let isReady = false;

  // Create Express app
  const app = createApp({
    config,
    logger,
    sessionManager,
    protocolHandler,
    registry,
    redis,
    isReady: () => isReady,
  });

  // Start HTTP server
  const httpServer = app.listen(config.port, () => {
    logger.info({ port: config.port }, 'HTTP server listening');
  });

  // Load initial data from Postgres
  const pgLoaderDeps = { db, logger, registry };
  await loadAllServers(pgLoaderDeps);

  // Redis sync
  const redisSubscriber = new RedisSubscriber({
    redis: redisSub,
    logger,
    registry,
    toolLoader,
    credentialCache,
    sessionManager,
    pgLoaderDeps,
  });

  const fallbackPoller = new FallbackPoller({
    logger,
    pgLoaderDeps,
    intervalMs: config.fallbackPollIntervalMs,
  });

  try {
    await redisSub.connect();
    await redisSubscriber.subscribe();
    logger.info('Redis subscriber connected');
  } catch (err) {
    logger.warn({ err }, 'Redis connection failed, starting fallback poller');
    fallbackPoller.start();
  }

  // Start session manager timers
  sessionManager.start();

  isReady = true;
  logger.info('MCP Runtime is ready');

  // Graceful shutdown with double-signal guard
  let isShuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info({ signal }, 'Received shutdown signal');
    isReady = false;

    try {
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
      sessionManager.stop();
      fallbackPoller.stop();

      await sessionManager.drainAll(config.drainTimeoutMs);
      await redisSubscriber.disconnect();

      try {
        await redisSub.quit();
        await redis.quit();
      } catch {
        // Redis may already be closed
      }

      await sql.end();
      clearKeyCache();
      logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', err);
  process.exit(1);
});
