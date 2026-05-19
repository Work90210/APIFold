import type { Logger } from '../observability/logger.js';

import type { PostgresLoaderDeps } from './postgres-loader.js';
import { loadAllServers } from './postgres-loader.js';

const MAX_INTERVAL_MS = 300_000; // 5 minutes cap

export interface FallbackPollerDeps {
  readonly logger: Logger;
  readonly pgLoaderDeps: PostgresLoaderDeps;
  readonly intervalMs: number;
  readonly onServerChange?: () => void;
}

/**
 * Fallback poller: periodically re-syncs from Postgres when Redis is unavailable.
 * Uses exponential backoff (up to 5 minutes) to avoid excessive DB traffic
 * when nothing is changing.
 */
export class FallbackPoller {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly logger: Logger;
  private readonly pgDeps: PostgresLoaderDeps;
  private readonly baseIntervalMs: number;
  private readonly onServerChange?: () => void;
  private currentIntervalMs: number;
  private consecutiveNoChange = 0;
  private lastServerHash = '';

  constructor(deps: FallbackPollerDeps) {
    this.logger = deps.logger;
    this.pgDeps = deps.pgLoaderDeps;
    this.baseIntervalMs = deps.intervalMs;
    this.currentIntervalMs = deps.intervalMs;
    this.onServerChange = deps.onServerChange;
  }

  start(): void {
    if (this.timer) return;
    this.scheduleNext();
    this.logger.info({ intervalMs: this.baseIntervalMs }, 'Fallback poller started');
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      this.logger.info('Fallback poller stopped');
    }
  }

  private scheduleNext(): void {
    this.timer = setTimeout(() => {
      this.poll()
        .catch((err) => {
          this.logger.error({ err }, 'Fallback poll failed');
        })
        .finally(() => {
          if (this.timer !== null) this.scheduleNext();
        });
    }, this.currentIntervalMs);
  }

  private async poll(): Promise<void> {
    this.logger.debug({ intervalMs: this.currentIntervalMs }, 'Fallback poller: reloading from Postgres');

    const registry = this.pgDeps.registry;
    const sizeBefore = registry.size;
    await loadAllServers(this.pgDeps);
    const sizeAfter = registry.size;

    // Simple change detection: compare registry size as a fast heuristic
    const hash = `${sizeAfter}`;
    if (hash === this.lastServerHash && sizeBefore === sizeAfter) {
      this.consecutiveNoChange++;
      // Exponential backoff: double interval each time nothing changes, up to max
      this.currentIntervalMs = Math.min(
        this.baseIntervalMs * Math.pow(2, this.consecutiveNoChange),
        MAX_INTERVAL_MS,
      );
    } else {
      // Something changed — reset to base interval
      this.consecutiveNoChange = 0;
      this.currentIntervalMs = this.baseIntervalMs;
      this.onServerChange?.();
    }
    this.lastServerHash = hash;
  }
}
