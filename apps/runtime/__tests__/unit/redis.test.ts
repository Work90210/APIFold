import { describe, it, expect, afterEach, vi } from 'vitest';
import { detectTls } from '../../src/redis.js';

describe('Redis client module', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('detectTls', () => {
    it('detects TLS from rediss:// scheme', () => {
      expect(detectTls('rediss://default:token@host:6379')).toBe(true);
    });

    it('returns false for redis:// scheme', () => {
      expect(detectTls('redis://:password@localhost:6379')).toBe(false);
    });

    it('detects TLS from REDIS_TLS env var', () => {
      vi.stubEnv('REDIS_TLS', 'true');
      expect(detectTls('redis://:password@localhost:6379')).toBe(true);
    });

    it('ignores REDIS_TLS when not "true"', () => {
      vi.stubEnv('REDIS_TLS', 'false');
      expect(detectTls('redis://:password@localhost:6379')).toBe(false);
    });
  });
});
