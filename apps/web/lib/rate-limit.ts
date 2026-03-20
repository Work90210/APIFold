import { randomBytes } from 'node:crypto';

import { getRedis } from './redis';

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 100;

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly resetAt: number;
}

// Lua script for atomic check-and-increment:
// 1. Remove expired entries
// 2. Count current entries
// 3. If under limit, add new entry and set TTL
// 4. Return the count
const RATE_LIMIT_SCRIPT = `
  local key = KEYS[1]
  local window_start = tonumber(ARGV[1])
  local now = tonumber(ARGV[2])
  local max_requests = tonumber(ARGV[3])
  local window_ms = tonumber(ARGV[4])
  local member = ARGV[5]

  redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)
  local count = redis.call('ZCARD', key)

  if count < max_requests then
    redis.call('ZADD', key, now, member)
    redis.call('PEXPIRE', key, window_ms)
    return count + 1
  end

  return -1
`;

export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  const redis = getRedis();
  const key = `ratelimit:api:${userId}`;
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const member = `${now}:${randomBytes(4).toString('hex')}`;

  try {
    const result = await redis.eval(
      RATE_LIMIT_SCRIPT,
      1,
      key,
      windowStart,
      now,
      MAX_REQUESTS,
      WINDOW_MS,
      member,
    ) as number;

    if (result === -1) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: Math.ceil((now + WINDOW_MS) / 1000),
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, MAX_REQUESTS - result),
      resetAt: Math.ceil((now + WINDOW_MS) / 1000),
    };
  } catch (err) {
    console.error('[rate-limit] Redis error, failing closed:', err instanceof Error ? err.message : err);
    return { allowed: false, remaining: 0, resetAt: Math.ceil((Date.now() + WINDOW_MS) / 1000) };
  }
}
