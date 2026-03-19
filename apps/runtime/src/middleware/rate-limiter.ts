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

/**
 * Per-server, per-client sliding window rate limiter backed by Redis.
 * Keys include client IP for isolation. Check-before-add to avoid bloating
 * the sorted set with rejected entries. Fail-open with debounced warnings.
 */
export function createPerServerRateLimiter(options: RateLimiterOptions): RequestHandler {
  const { redis, logger, windowMs, defaultMax } = options;

  // Debounce Redis error warnings — at most once per 10 seconds
  let lastRedisWarningAt = 0;
  const REDIS_WARN_INTERVAL_MS = 10_000;

  return async (req, res, next) => {
    const slug = req.params['slug'];
    if (!slug || slug.length > SLUG_MAX_LENGTH || !SLUG_PATTERN.test(slug)) {
      next();
      return;
    }

    const maxRequests = (req as unknown as { serverRateLimit?: number }).serverRateLimit ?? defaultMax;
    const clientId = req.ip ?? 'unknown';
    const key = `ratelimit:${slug}:${clientId}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Step 1: Clean expired entries and count BEFORE adding
      const pipeline = redis.pipeline();
      pipeline.zremrangebyscore(key, '-inf', windowStart);
      pipeline.zcard(key);

      const results = await pipeline.exec();
      const count = (results?.[1]?.[1] as number) ?? 0;

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - count));
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));

      if (count >= maxRequests) {
        res.status(429).json({ error: 'Rate limit exceeded' });
        return;
      }

      // Step 2: Only add if under limit — prevents rejected-request bloat
      await redis.zadd(key, now, `${now}:${Math.random().toString(36).slice(2, 8)}`);
      await redis.pexpire(key, windowMs);

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
