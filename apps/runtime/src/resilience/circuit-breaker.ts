import type { Logger } from '../observability/logger.js';
import { metrics } from '../observability/metrics.js';

type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitEntry {
  state: CircuitState;
  failureCount: number;
  lastFailureAt: number;
  lastAccessedAt: number;
  successCount: number;
}

export interface CircuitBreakerConfig {
  readonly failureThreshold: number;
  readonly cooldownMs: number;
  readonly halfOpenMaxProbes: number;
  /** How long an idle circuit lives before being pruned (default 10 min). */
  readonly staleTtlMs?: number;
  /** Max number of tracked circuits (default 5000). */
  readonly maxCircuits?: number;
}

export interface CircuitBreakerDeps {
  readonly config: CircuitBreakerConfig;
  readonly logger: Logger;
}

const DEFAULT_STALE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const DEFAULT_MAX_CIRCUITS = 5_000;
const CLEANUP_INTERVAL_MS = 60_000; // 1 minute

export class CircuitBreaker {
  private readonly circuits = new Map<string, CircuitEntry>();
  private readonly config: CircuitBreakerConfig;
  private readonly logger: Logger;
  private readonly staleTtlMs: number;
  private readonly maxCircuits: number;
  private readonly cleanupTimer: ReturnType<typeof setInterval>;

  constructor(deps: CircuitBreakerDeps) {
    this.config = deps.config;
    this.logger = deps.logger;
    this.staleTtlMs = deps.config.staleTtlMs ?? DEFAULT_STALE_TTL_MS;
    this.maxCircuits = deps.config.maxCircuits ?? DEFAULT_MAX_CIRCUITS;

    this.cleanupTimer = setInterval(() => this.pruneStale(), CLEANUP_INTERVAL_MS);
    this.cleanupTimer.unref();
  }

  isOpen(upstream: string): boolean {
    const circuit = this.circuits.get(upstream);
    if (!circuit) return false;

    circuit.lastAccessedAt = Date.now();

    if (circuit.state === 'closed') return false;

    if (circuit.state === 'open') {
      const elapsed = Date.now() - circuit.lastFailureAt;
      if (elapsed >= this.config.cooldownMs) {
        circuit.state = 'half-open';
        circuit.successCount = 0;
        this.logger.info({ upstream }, 'Circuit breaker half-open');
        metrics.incrementCounter('circuit_breaker_transitions_total', {
          upstream,
          to: 'half-open',
        });
        return false;
      }
      return true;
    }

    // half-open: allow probes
    return false;
  }

  recordSuccess(upstream: string): void {
    const circuit = this.circuits.get(upstream);
    if (!circuit) return;

    circuit.lastAccessedAt = Date.now();

    if (circuit.state === 'half-open') {
      circuit.successCount += 1;
      if (circuit.successCount >= this.config.halfOpenMaxProbes) {
        circuit.state = 'closed';
        circuit.failureCount = 0;
        this.logger.info({ upstream }, 'Circuit breaker closed');
        metrics.incrementCounter('circuit_breaker_transitions_total', {
          upstream,
          to: 'closed',
        });
      }
    } else if (circuit.state === 'closed') {
      circuit.failureCount = 0;
    }
  }

  recordFailure(upstream: string): void {
    const now = Date.now();
    let circuit = this.circuits.get(upstream);
    if (!circuit) {
      if (this.circuits.size >= this.maxCircuits) {
        this.logger.warn({ upstream, max: this.maxCircuits }, 'Circuit breaker map at capacity, dropping new entry');
        return;
      }
      circuit = { state: 'closed', failureCount: 0, lastFailureAt: 0, lastAccessedAt: now, successCount: 0 };
      this.circuits.set(upstream, circuit);
    }

    circuit.failureCount += 1;
    circuit.lastFailureAt = now;
    circuit.lastAccessedAt = now;

    if (circuit.state === 'half-open') {
      circuit.state = 'open';
      this.logger.warn({ upstream }, 'Circuit breaker re-opened from half-open');
      metrics.incrementCounter('circuit_breaker_transitions_total', { upstream, to: 'open' });
      return;
    }

    if (circuit.failureCount >= this.config.failureThreshold) {
      circuit.state = 'open';
      this.logger.warn({ upstream, failureCount: circuit.failureCount }, 'Circuit breaker opened');
      metrics.incrementCounter('circuit_breaker_transitions_total', { upstream, to: 'open' });
    }
  }

  getState(upstream: string): CircuitState {
    return this.circuits.get(upstream)?.state ?? 'closed';
  }

  reset(upstream: string): void {
    this.circuits.delete(upstream);
  }

  resetAll(): void {
    this.circuits.clear();
  }

  dispose(): void {
    clearInterval(this.cleanupTimer);
  }

  private pruneStale(): void {
    const now = Date.now();
    let pruned = 0;
    for (const [upstream, circuit] of this.circuits) {
      const age = now - circuit.lastAccessedAt;
      // Only prune closed or half-open circuits. Open circuits must stay — pruning them
      // would silently reset the breaker, allowing traffic to a still-broken upstream.
      if (circuit.state !== 'open' && age > this.staleTtlMs) {
        this.circuits.delete(upstream);
        pruned++;
      }
    }
    if (pruned > 0) {
      this.logger.debug({ pruned, remaining: this.circuits.size }, 'Stale circuits pruned');
    }
  }
}
