import { Redis } from 'ioredis';

let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (redisInstance === null) {
    const url = process.env['REDIS_URL'];
    if (!url) {
      throw new Error('REDIS_URL environment variable is required');
    }

    let errorLogged = false;
    redisInstance = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        // Give up after 5 attempts — prevents infinite reconnection loops
        // that eat memory and spam logs (e.g., WRONGPASS)
        if (times > 5) return null;
        return Math.min(times * 500, 3000);
      },
      lazyConnect: false,
    });
    redisInstance.on('error', (err) => {
      // Log once, not every second
      if (!errorLogged) {
        errorLogged = true;
        // eslint-disable-next-line no-console
        console.error('[redis] connection failed (will not retry):', err.message);
      }
    });
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
