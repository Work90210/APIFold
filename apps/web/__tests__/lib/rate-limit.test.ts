import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRateLimit } from '../../lib/rate-limit.js';

vi.mock('../../lib/redis.js', () => {
  const mockRedis = {
    eval: vi.fn().mockResolvedValue(5), // 5 requests used, under limit
  };

  return {
    getRedis: vi.fn().mockReturnValue(mockRedis),
    _mockRedis: mockRedis,
  };
});

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows requests under the limit', async () => {
    const result = await checkRateLimit('user-1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });

  it('blocks requests at the limit', async () => {
    const { _mockRedis } = await import('../../lib/redis.js') as unknown as { _mockRedis: { eval: ReturnType<typeof vi.fn> } };
    _mockRedis.eval.mockResolvedValue(-1); // Lua script returns -1 when over limit

    const result = await checkRateLimit('user-1');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('fails closed on Redis error', async () => {
    const { _mockRedis } = await import('../../lib/redis.js') as unknown as { _mockRedis: { eval: ReturnType<typeof vi.fn> } };
    _mockRedis.eval.mockRejectedValue(new Error('Redis down'));

    const result = await checkRateLimit('user-1');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});
