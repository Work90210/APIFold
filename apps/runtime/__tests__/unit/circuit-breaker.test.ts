import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CircuitBreaker } from '../../src/resilience/circuit-breaker.js';
import { createTestLogger } from '../helpers.js';

describe('CircuitBreaker', () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    vi.useFakeTimers();
    cb = new CircuitBreaker({
      config: { failureThreshold: 3, cooldownMs: 10_000, halfOpenMaxProbes: 2 },
      logger: createTestLogger(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in closed state', () => {
    expect(cb.getState('upstream')).toBe('closed');
    expect(cb.isOpen('upstream')).toBe(false);
  });

  it('stays closed below failure threshold', () => {
    cb.recordFailure('upstream');
    cb.recordFailure('upstream');
    expect(cb.isOpen('upstream')).toBe(false);
  });

  it('opens after reaching failure threshold', () => {
    cb.recordFailure('upstream');
    cb.recordFailure('upstream');
    cb.recordFailure('upstream');
    expect(cb.isOpen('upstream')).toBe(true);
    expect(cb.getState('upstream')).toBe('open');
  });

  it('transitions to half-open after cooldown', () => {
    cb.recordFailure('upstream');
    cb.recordFailure('upstream');
    cb.recordFailure('upstream');

    vi.advanceTimersByTime(10_000);
    expect(cb.isOpen('upstream')).toBe(false);
    expect(cb.getState('upstream')).toBe('half-open');
  });

  it('closes after successful probes in half-open', () => {
    cb.recordFailure('upstream');
    cb.recordFailure('upstream');
    cb.recordFailure('upstream');

    vi.advanceTimersByTime(10_000);
    cb.isOpen('upstream'); // trigger half-open transition

    cb.recordSuccess('upstream');
    expect(cb.getState('upstream')).toBe('half-open');

    cb.recordSuccess('upstream');
    expect(cb.getState('upstream')).toBe('closed');
    expect(cb.isOpen('upstream')).toBe(false);
  });

  it('re-opens on failure in half-open state', () => {
    cb.recordFailure('upstream');
    cb.recordFailure('upstream');
    cb.recordFailure('upstream');

    vi.advanceTimersByTime(10_000);
    cb.isOpen('upstream'); // trigger half-open

    cb.recordFailure('upstream');
    expect(cb.getState('upstream')).toBe('open');
    expect(cb.isOpen('upstream')).toBe(true);
  });

  it('resets failure count on success in closed state', () => {
    cb.recordFailure('upstream');
    cb.recordFailure('upstream');
    cb.recordSuccess('upstream');
    cb.recordFailure('upstream');
    cb.recordFailure('upstream');

    expect(cb.isOpen('upstream')).toBe(false);
  });

  it('isolates circuits per upstream', () => {
    cb.recordFailure('a');
    cb.recordFailure('a');
    cb.recordFailure('a');

    expect(cb.isOpen('a')).toBe(true);
    expect(cb.isOpen('b')).toBe(false);
  });

  it('reset clears a specific upstream', () => {
    cb.recordFailure('upstream');
    cb.recordFailure('upstream');
    cb.recordFailure('upstream');
    cb.reset('upstream');

    expect(cb.getState('upstream')).toBe('closed');
  });
});
