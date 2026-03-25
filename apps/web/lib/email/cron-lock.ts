import { getRedis } from "@/lib/redis";

const DEFAULT_LOCK_TTL_SECONDS = 300;

export async function acquireCronLock(
  jobName: string,
  ttlSeconds: number = DEFAULT_LOCK_TTL_SECONDS,
): Promise<boolean> {
  const redis = getRedis();
  const key = `cron:lock:${jobName}`;
  const result = await redis.set(key, Date.now().toString(), "EX", ttlSeconds, "NX");
  return result === "OK";
}

export async function releaseCronLock(jobName: string): Promise<void> {
  const redis = getRedis();
  const key = `cron:lock:${jobName}`;
  await redis.del(key);
}
