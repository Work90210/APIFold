import type { Logger } from '../observability/logger.js';
import { metrics } from '../observability/metrics.js';

type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitEntry {
  state: CircuitState;
  failureCount: number;
  lastFailureAt: number;
  successCount: number;
}

export interface CircuitBreakerConfig {
  readonly failureThreshold: number;
  readonly cooldownMs: number;
  readonly halfOpenMaxProbes: number;
}

export interface CircuitBreakerDeps {
  readonly config: CircuitBreakerConfig;
  readonly logger: Logger;
}

export class CircuitBreaker {
  private readonly circuits = new Map<string, CircuitEntry>();
  private readonly config: CircuitBreakerConfig;
  private readonly logger: Logger;

  constructor(deps: CircuitBreakerDeps) {
    this.config = deps.config;
    this.logger = deps.logger;
  }

  isOpen(upstream: string): boolean {
    const circuit = this.circuits.get(upstream);
    if (!circuit) return false;

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
    let circuit = this.circuits.get(upstream);
    if (!circuit) {
      circuit = { state: 'closed', failureCount: 0, lastFailureAt: 0, successCount: 0 };
      this.circuits.set(upstream, circuit);
    }

    circuit.failureCount += 1;
    circuit.lastFailureAt = Date.now();

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
}
