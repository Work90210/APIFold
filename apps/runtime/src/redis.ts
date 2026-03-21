import { Redis, type RedisOptions } from 'ioredis';

export interface RedisClientOptions {
  url: string;
  maxRetries?: number;
  lazyConnect?: boolean;
}

function detectTls(url: string): boolean {
  return url.startsWith('rediss://') || process.env['REDIS_TLS'] === 'true';
}

function buildOptions(opts: RedisClientOptions): RedisOptions {
  const maxRetries = opts.maxRetries ?? parseInt(process.env['REDIS_MAX_RETRIES'] ?? '10', 10);
  const tls = detectTls(opts.url);

  return {
    lazyConnect: opts.lazyConnect ?? true,
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      if (times > maxRetries) return null;
      return Math.min(times * 200, 5000);
    },
    ...(tls ? { tls: {} } : {}),
  };
}

const clients: Redis[] = [];

export function createRedisClient(opts: RedisClientOptions): Redis {
  const client = new Redis(opts.url, buildOptions(opts));
  clients.push(client);
  return client;
}

export async function redisHealthCheck(client: Redis): Promise<'ok' | 'error'> {
  try {
    const result = await client.ping();
    return result === 'PONG' ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}

export async function closeRedis(): Promise<void> {
  const promises = clients.map(async (client) => {
    try {
      await client.quit();
    } catch {
      // Client may already be closed
    }
  });
  await Promise.all(promises);
  clients.length = 0;
}

export { detectTls };
