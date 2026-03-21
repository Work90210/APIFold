import { randomBytes } from 'node:crypto';
import type { RequestHandler } from 'express';
import type { Redis } from 'ioredis';

import type { Logger } from '../observability/logger.js';

export interface RateLimiterOptions {
  readonly redis: Redis;
  readonly logger: Logger;
  readonly windowMs: number;
  readonly defaultMax: number;
}

const SLUG_MAX_LENGTH = 64;
const SLUG_PATTERN = /^[a-z0-9-]+$/;

// Atomic Lua script: clean, check, conditionally add
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

export function createPerServerRateLimiter(options: RateLimiterOptions): RequestHandler {
  const { redis, logger, windowMs, defaultMax } = options;

  let lastRedisWarningAt = 0;
  const REDIS_WARN_INTERVAL_MS = 10_000;

  return async (req, res, next) => {
    const slug = req.params['slug'];
    if (!slug || slug.length > SLUG_MAX_LENGTH || !SLUG_PATTERN.test(slug)) {
      res.status(400).json({ error: 'Invalid server slug' });
      return;
    }

    const maxRequests = (req as unknown as { serverRateLimit?: number }).serverRateLimit ?? defaultMax;
    const clientId = req.ip ?? 'unknown';
    const key = `ratelimit:${slug}:${clientId}`;
    const now = Date.now();
    const windowStart = now - windowMs;
    const member = `${now}:${randomBytes(4).toString('hex')}`;

    try {
      const result = await redis.eval(
        RATE_LIMIT_SCRIPT, 1, key,
        windowStart, now, maxRequests, windowMs, member,
      ) as number;

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));

      if (result === -1) {
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
        res.status(429).json({ error: 'Rate limit exceeded' });
        return;
      }

      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - result));
      next();
    } catch (err) {
      const now2 = Date.now();
      if (now2 - lastRedisWarningAt >= REDIS_WARN_INTERVAL_MS) {
        lastRedisWarningAt = now2;
        logger.warn({ err, slug }, 'Rate limiter Redis error, allowing request');
      }
      next();
    }
  };
}
