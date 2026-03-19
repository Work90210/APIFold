import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPerServerRateLimiter } from '../../src/middleware/rate-limiter.js';
import { createTestLogger } from '../helpers.js';

function createMockRedis(count = 1) {
  const pipelineResult = {
    zremrangebyscore: vi.fn().mockReturnThis(),
    zcard: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([
      [null, 0],      // zremrangebyscore result
      [null, count],  // zcard result
    ]),
  };

  return {
    pipeline: vi.fn().mockReturnValue(pipelineResult),
    zadd: vi.fn().mockResolvedValue(1),
    pexpire: vi.fn().mockResolvedValue(1),
    _pipelineResult: pipelineResult,
  };
}

function createMockReqRes(slug?: string) {
  const req = {
    params: { slug },
    headers: {},
    ip: '127.0.0.1',
  } as never;
  const res = {
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as never;
  const next = vi.fn();
  return { req, res, next };
}

describe('createPerServerRateLimiter', () => {
  let redis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    redis = createMockRedis(1);
  });

  it('allows requests under the limit', async () => {
    const limiter = createPerServerRateLimiter({
      redis: redis as never,
      logger: createTestLogger(),
      windowMs: 60_000,
      defaultMax: 100,
    });

    const { req, res, next } = createMockReqRes('test-slug');
    await limiter(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(redis.zadd).toHaveBeenCalled(); // entry added after check
  });

  it('blocks requests at the limit without adding to sorted set', async () => {
    redis = createMockRedis(100); // at limit

    const limiter = createPerServerRateLimiter({
      redis: redis as never,
      logger: createTestLogger(),
      windowMs: 60_000,
      defaultMax: 100,
    });

    const { req, res, next } = createMockReqRes('test-slug');
    await limiter(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect((res as { status: ReturnType<typeof vi.fn> }).status).toHaveBeenCalledWith(429);
    expect(redis.zadd).not.toHaveBeenCalled(); // no bloat
  });

  it('passes through when no slug', async () => {
    const limiter = createPerServerRateLimiter({
      redis: redis as never,
      logger: createTestLogger(),
      windowMs: 60_000,
      defaultMax: 100,
    });

    const { req, res, next } = createMockReqRes(undefined);
    await limiter(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(redis.pipeline).not.toHaveBeenCalled();
  });

  it('passes through for invalid slug format', async () => {
    const limiter = createPerServerRateLimiter({
      redis: redis as never,
      logger: createTestLogger(),
      windowMs: 60_000,
      defaultMax: 100,
    });

    const { req, res, next } = createMockReqRes('INVALID_SLUG!');
    await limiter(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(redis.pipeline).not.toHaveBeenCalled();
  });

  it('allows request on Redis error (fail-open) without setting rate limit headers', async () => {
    redis._pipelineResult.exec.mockRejectedValue(new Error('Redis down'));

    const limiter = createPerServerRateLimiter({
      redis: redis as never,
      logger: createTestLogger(),
      windowMs: 60_000,
      defaultMax: 100,
    });

    const { req, res, next } = createMockReqRes('test-slug');
    await limiter(req, res, next);

    expect(next).toHaveBeenCalled();
    // No rate limit headers set when Redis is down
    expect((res as { setHeader: ReturnType<typeof vi.fn> }).setHeader).not.toHaveBeenCalled();
  });

  it('includes client IP in Redis key for per-client isolation', async () => {
    const limiter = createPerServerRateLimiter({
      redis: redis as never,
      logger: createTestLogger(),
      windowMs: 60_000,
      defaultMax: 100,
    });

    const { req, res, next } = createMockReqRes('test-slug');
    await limiter(req, res, next);

    // zadd should be called with key containing client IP
    const zaddCall = redis.zadd.mock.calls[0];
    expect(zaddCall?.[0]).toContain('127.0.0.1');
  });
});
