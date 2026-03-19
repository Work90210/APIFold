import { Redis } from 'ioredis';

let redisInstance: Redis | null = null;

function getRedisUrl(): string {
  const url = process.env['REDIS_URL'];
  if (!url) {
    throw new Error('REDIS_URL environment variable is required');
  }
  return url;
}

export function getRedis(): Redis {
  if (redisInstance === null) {
    redisInstance = new Redis(getRedisUrl(), {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });
    // eslint-disable-next-line no-console
    redisInstance.on('error', (err) => console.error('[redis] connection error:', err.message));
  }
  return redisInstance;
}

export async function publishServerEvent(
  event: { readonly type: string; readonly serverId: string; readonly slug?: string },
): Promise<void> {
  try {
    const redis = getRedis();
    await redis.publish('mcp:server-events', JSON.stringify(event));
  } catch {
    // Best-effort: don't crash the request if Redis is down
  }
}
