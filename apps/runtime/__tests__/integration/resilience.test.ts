import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CircuitBreaker } from '../../src/resilience/circuit-breaker.js';
import { FallbackPoller } from '../../src/sync/fallback-poller.js';
import { ServerRegistry } from '../../src/registry/server-registry.js';
import type { DbClient } from '../../src/sync/postgres-loader.js';
import { createTestLogger } from '../helpers.js';

describe('Resilience Integration', () => {
  const logger = createTestLogger();

  describe('Circuit Breaker under load', () => {
    let cb: CircuitBreaker;

    beforeEach(() => {
      vi.useFakeTimers();
      cb = new CircuitBreaker({
        config: { failureThreshold: 3, cooldownMs: 10_000, halfOpenMaxProbes: 2 },
        logger,
      });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('full lifecycle: closed → open → half-open → closed', () => {
      // Start closed
      expect(cb.getState('upstream-1')).toBe('closed');

      // Accumulate failures
      cb.recordFailure('upstream-1');
      cb.recordFailure('upstream-1');
      cb.recordFailure('upstream-1');
      expect(cb.getState('upstream-1')).toBe('open');
      expect(cb.isOpen('upstream-1')).toBe(true);

      // Wait for cooldown
      vi.advanceTimersByTime(10_000);
      expect(cb.isOpen('upstream-1')).toBe(false); // transitions to half-open
      expect(cb.getState('upstream-1')).toBe('half-open');

      // Successful probes close it
      cb.recordSuccess('upstream-1');
      cb.recordSuccess('upstream-1');
      expect(cb.getState('upstream-1')).toBe('closed');

      // New failures start fresh count
      cb.recordFailure('upstream-1');
      expect(cb.getState('upstream-1')).toBe('closed'); // only 1 failure
    });

    it('half-open re-opens on failure', () => {
      cb.recordFailure('upstream-1');
      cb.recordFailure('upstream-1');
      cb.recordFailure('upstream-1');

      vi.advanceTimersByTime(10_000);
      cb.isOpen('upstream-1'); // trigger half-open

      cb.recordFailure('upstream-1');
      expect(cb.getState('upstream-1')).toBe('open');

      // Must wait another cooldown
      expect(cb.isOpen('upstream-1')).toBe(true);
      vi.advanceTimersByTime(10_000);
      expect(cb.isOpen('upstream-1')).toBe(false);
    });

    it('isolates per upstream', () => {
      cb.recordFailure('a');
      cb.recordFailure('a');
      cb.recordFailure('a');

      cb.recordFailure('b');

      expect(cb.isOpen('a')).toBe(true);
      expect(cb.isOpen('b')).toBe(false);
    });
  });

  describe('Fallback Poller', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('reloads servers on each poll interval', async () => {
      vi.useRealTimers(); // Use real timers for this async test

      const serverRow = {
        id: 'srv-1', slug: 'polled', user_id: 'user-1',
        auth_mode: 'none', base_url: 'https://polled.example.com',
        rate_limit: 100, is_active: true,
      };

      const db: DbClient = { query: vi.fn().mockResolvedValue({ rows: [serverRow] }) };
      const registry = new ServerRegistry({ logger });
      const pgLoaderDeps = { db, logger, registry };

      const poller = new FallbackPoller({
        logger,
        pgLoaderDeps,
        intervalMs: 100, // Short interval for fast test
      });

      poller.start();

      // Before first poll
      expect(registry.size).toBe(0);

      // Wait for first poll
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(registry.getBySlug('polled')).toBeDefined();

      // Server goes away
      (db.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [] });
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(registry.size).toBe(0);

      poller.stop();
    });
  });
});
