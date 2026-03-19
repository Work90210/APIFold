import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CredentialCache, type CredentialFetcher } from '../../src/registry/credential-cache.js';
import { createTestLogger } from '../helpers.js';

describe('CredentialCache (L2)', () => {
  let fetchHeaders: ReturnType<typeof vi.fn<CredentialFetcher>>;
  let cache: CredentialCache;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchHeaders = vi.fn<CredentialFetcher>().mockResolvedValue({ Authorization: 'Bearer tok123' });
    cache = new CredentialCache({
      logger: createTestLogger(),
      fetchHeaders,
      ttlMs: 300_000, // 5 min
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetches headers on cache miss', async () => {
    const headers = await cache.getHeaders('srv-1');
    expect(headers).toEqual({ Authorization: 'Bearer tok123' });
    expect(fetchHeaders).toHaveBeenCalledWith('srv-1');
  });

  it('returns cached headers within TTL', async () => {
    await cache.getHeaders('srv-1');
    vi.advanceTimersByTime(60_000); // 1 min
    const headers = await cache.getHeaders('srv-1');

    expect(headers).toEqual({ Authorization: 'Bearer tok123' });
    expect(fetchHeaders).toHaveBeenCalledOnce();
  });

  it('refetches after TTL expires', async () => {
    await cache.getHeaders('srv-1');
    vi.advanceTimersByTime(300_001); // just past TTL

    fetchHeaders.mockResolvedValue({ Authorization: 'Bearer new-token' });
    const headers = await cache.getHeaders('srv-1');

    expect(headers).toEqual({ Authorization: 'Bearer new-token' });
    expect(fetchHeaders).toHaveBeenCalledTimes(2);
  });

  it('evicts specific server', async () => {
    await cache.getHeaders('srv-1');
    cache.evict('srv-1');

    fetchHeaders.mockResolvedValue({ 'X-API-Key': 'key456' });
    const headers = await cache.getHeaders('srv-1');

    expect(headers).toEqual({ 'X-API-Key': 'key456' });
    expect(fetchHeaders).toHaveBeenCalledTimes(2);
  });

  it('retries after a rejected fetch — does not cache errors', async () => {
    fetchHeaders.mockRejectedValueOnce(new Error('Decrypt failed'));

    await expect(cache.getHeaders('srv-1')).rejects.toThrow('Decrypt failed');

    fetchHeaders.mockResolvedValue({ Authorization: 'Bearer recovered' });
    const headers = await cache.getHeaders('srv-1');

    expect(headers).toEqual({ Authorization: 'Bearer recovered' });
    expect(fetchHeaders).toHaveBeenCalledTimes(2);
  });

  it('coalesces concurrent requests', async () => {
    const [h1, h2] = await Promise.all([
      cache.getHeaders('srv-1'),
      cache.getHeaders('srv-1'),
    ]);

    expect(h1).toBe(h2);
    expect(fetchHeaders).toHaveBeenCalledOnce();
  });
});
