import { z } from 'zod';

const configSchema = z.object({
  port: z.coerce.number().int().min(1).max(65535).default(3001),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  databaseUrl: z.string().url().refine((url) => url.startsWith('postgres'), { message: 'DATABASE_URL must use a postgres:// or postgresql:// scheme' }),
  databasePoolMax: z.coerce.number().int().min(1).max(100).default(20),

  // Redis
  redisUrl: z.string().url().refine((url) => url.startsWith('redis'), { message: 'REDIS_URL must use a redis:// or rediss:// scheme' }),

  // Vault
  vaultSecret: z.string().min(32),
  vaultSalt: z.string().min(32),

  // Inter-service auth
  runtimeSecret: z.string().min(32),

  // SSE
  maxSseSessions: z.coerce.number().int().min(1).default(10_000),
  sseHeartbeatIntervalMs: z.coerce.number().int().min(1000).default(30_000),
  sseIdleTimeoutMs: z.coerce.number().int().min(10_000).default(300_000),

  // Resilience
  circuitBreakerThreshold: z.coerce.number().int().min(1).default(5),
  circuitBreakerCooldownMs: z.coerce.number().int().min(1000).default(30_000),
  upstreamTimeoutMs: z.coerce.number().int().min(1000).default(30_000),

  // Credential cache
  credentialTtlMs: z.coerce.number().int().min(10_000).default(300_000),

  // Fallback poller
  fallbackPollIntervalMs: z.coerce.number().int().min(5000).default(30_000),

  // CORS — required in production, defaults to '*' for development only
  corsOrigins: z.string().default('*'),

  // Rate limiting
  globalRateLimitWindowMs: z.coerce.number().int().min(1000).default(900_000),
  globalRateLimitMax: z.coerce.number().int().min(1).default(1000),

  // Graceful shutdown
  drainTimeoutMs: z.coerce.number().int().min(1000).default(30_000),

  // Log level
  logLevel: z.enum(['silent', 'fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Cluster
  runtimeMaxWorkers: z.coerce.number().int().min(1).max(8).default(4),
  runtimeShutdownGraceMs: z.coerce.number().int().min(1000).default(10_000),
  runtimeHealthPort: z.coerce.number().int().min(1).max(65535).default(9090),

  // Connection capacity
  maxConnectionsPerWorker: z.coerce.number().int().min(1).default(100),

  // Optional MCP API key — when set, all /mcp/:slug requests require Bearer <key>
  mcpApiKey: z.string().min(32).optional(),
});

export type RuntimeConfig = z.infer<typeof configSchema>;

export function loadConfig(): RuntimeConfig {
  const result = configSchema.safeParse({
    port: process.env['RUNTIME_PORT'],
    nodeEnv: process.env['NODE_ENV'],
    databaseUrl: process.env['DATABASE_URL'],
    databasePoolMax: process.env['DATABASE_POOL_MAX'],
    redisUrl: process.env['REDIS_URL'],
    vaultSecret: process.env['VAULT_SECRET'],
    vaultSalt: process.env['VAULT_SALT'],
    runtimeSecret: process.env['MCP_RUNTIME_SECRET'],
    maxSseSessions: process.env['MAX_SSE_SESSIONS'],
    sseHeartbeatIntervalMs: process.env['SSE_HEARTBEAT_INTERVAL_MS'],
    sseIdleTimeoutMs: process.env['SSE_IDLE_TIMEOUT_MS'],
    circuitBreakerThreshold: process.env['CIRCUIT_BREAKER_THRESHOLD'],
    circuitBreakerCooldownMs: process.env['CIRCUIT_BREAKER_COOLDOWN_MS'],
    upstreamTimeoutMs: process.env['UPSTREAM_TIMEOUT_MS'],
    credentialTtlMs: process.env['CREDENTIAL_TTL_MS'],
    fallbackPollIntervalMs: process.env['FALLBACK_POLL_INTERVAL_MS'],
    corsOrigins: process.env['CORS_ORIGINS'],
    globalRateLimitWindowMs: process.env['GLOBAL_RATE_LIMIT_WINDOW_MS'],
    globalRateLimitMax: process.env['GLOBAL_RATE_LIMIT_MAX'],
    drainTimeoutMs: process.env['DRAIN_TIMEOUT_MS'],
    logLevel: process.env['LOG_LEVEL'],
    runtimeMaxWorkers: process.env['RUNTIME_MAX_WORKERS'],
    runtimeShutdownGraceMs: process.env['RUNTIME_SHUTDOWN_GRACE_MS'],
    runtimeHealthPort: process.env['RUNTIME_HEALTH_PORT'],
    maxConnectionsPerWorker: process.env['RUNTIME_MAX_CONNECTIONS_PER_WORKER'],
    mcpApiKey: process.env['MCP_API_KEY'] || undefined,
  });

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid runtime configuration:\n${formatted}`);
  }

  const config = Object.freeze(result.data);

  if (config.nodeEnv === 'production' && config.corsOrigins === '*') {
    process.stderr.write(
      '[runtime] WARNING: CORS_ORIGINS is set to wildcard (*) in production. Set CORS_ORIGINS to restrict origins.\n',
    );
  }

  if (config.nodeEnv !== 'production' && config.nodeEnv !== 'test') {
    process.stderr.write(
      `[runtime] WARNING: NODE_ENV is "${config.nodeEnv}". Set NODE_ENV=production for production deployments.\n`,
    );
  }

  return config;
}
