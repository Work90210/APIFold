import { randomUUID } from "crypto";
import { getRedis } from "@/lib/redis";

const DEFAULT_LOCK_TTL_SECONDS = 300;

const RELEASE_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

export async function acquireCronLock(
  jobName: string,
  ttlSeconds: number = DEFAULT_LOCK_TTL_SECONDS,
): Promise<string | null> {
  const redis = getRedis();
  const key = `cron:lock:${jobName}`;
  const token = randomUUID();
  const result = await redis.set(key, token, "EX", ttlSeconds, "NX");
  return result === "OK" ? token : null;
}

export async function releaseCronLock(
  jobName: string,
  token: string,
): Promise<void> {
  const redis = getRedis();
  const key = `cron:lock:${jobName}`;
  await redis.eval(RELEASE_SCRIPT, 1, key, token);
}
