import { getRedis } from "@/lib/redis";
import { getDb } from "@/lib/db";
import { usageEvents } from "@/lib/db/schema";

function getRedisKey(userId: string): string {
  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return `usage:${userId}:${month}`;
}

export async function incrementUsage(userId: string): Promise<number> {
  const redis = getRedis();
  const key = getRedisKey(userId);
  const pipeline = redis.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, 35 * 24 * 60 * 60);
  const results = await pipeline.exec();

  if (!results || !results[0]) {
    throw new Error("Redis pipeline failed for usage increment");
  }

  const [err, count] = results[0];
  if (err) throw err;

  const currentCount = count as number;

  return currentCount;
}

export async function getMonthlyUsage(userId: string): Promise<number> {
  const redis = getRedis();
  const key = getRedisKey(userId);
  const value = await redis.get(key);
  if (!value) return 0;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function flushToDatabase(
  userId: string,
  serverId: string,
  _count: number,
): Promise<void> {
  const db = getDb();
  await db.insert(usageEvents).values({
    userId,
    serverId,
    timestamp: new Date(),
    durationMs: 0,
    statusCode: 200,
    errorCode: null,
  });
}
