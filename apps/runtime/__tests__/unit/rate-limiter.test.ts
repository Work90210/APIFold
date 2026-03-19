import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPerServerRateLimiter } from '../../src/middleware/rate-limiter.js';
import { createTestLogger } from '../helpers.js';

function createMockRedis(evalResult = 5) {
  return {
    eval: vi.fn().mockResolvedValue(evalResult),
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
    redis = createMockRedis(5); // 5 requests used, under default 100
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
    expect(redis.eval).toHaveBeenCalled();
  });

  it('blocks requests at the limit', async () => {
    redis = createMockRedis(-1); // Lua returns -1 when at limit

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
    expect(redis.eval).not.toHaveBeenCalled();
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
    expect(redis.eval).not.toHaveBeenCalled();
  });

  it('allows request on Redis error (fail-open)', async () => {
    redis.eval.mockRejectedValue(new Error('Redis down'));

    const limiter = createPerServerRateLimiter({
      redis: redis as never,
      logger: createTestLogger(),
      windowMs: 60_000,
      defaultMax: 100,
    });

    const { req, res, next } = createMockReqRes('test-slug');
    await limiter(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('includes client IP in Redis key', async () => {
    const limiter = createPerServerRateLimiter({
      redis: redis as never,
      logger: createTestLogger(),
      windowMs: 60_000,
      defaultMax: 100,
    });

    const { req, res, next } = createMockReqRes('test-slug');
    await limiter(req, res, next);

    const evalCall = redis.eval.mock.calls[0];
    const key = evalCall?.[2]; // KEYS[1]
    expect(key).toContain('127.0.0.1');
  });
});
