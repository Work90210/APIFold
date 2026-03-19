import type { Logger } from '../observability/logger.js';

import type { PostgresLoaderDeps } from './postgres-loader.js';
import { loadAllServers } from './postgres-loader.js';

export interface FallbackPollerDeps {
  readonly logger: Logger;
  readonly pgLoaderDeps: PostgresLoaderDeps;
  readonly intervalMs: number;
}

/**
 * Fallback poller: periodically re-syncs from Postgres when Redis is unavailable.
 * Polls at the configured interval and fully reloads the server registry.
 */
export class FallbackPoller {
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly logger: Logger;
  private readonly pgDeps: PostgresLoaderDeps;
  private readonly intervalMs: number;

  constructor(deps: FallbackPollerDeps) {
    this.logger = deps.logger;
    this.pgDeps = deps.pgLoaderDeps;
    this.intervalMs = deps.intervalMs;
  }

  start(): void {
    if (this.timer) return;

    this.timer = setInterval(() => {
      this.poll().catch((err) => {
        this.logger.error({ err }, 'Fallback poll failed');
      });
    }, this.intervalMs);

    this.logger.info({ intervalMs: this.intervalMs }, 'Fallback poller started');
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.logger.info('Fallback poller stopped');
    }
  }

  private async poll(): Promise<void> {
    this.logger.debug('Fallback poller: reloading from Postgres');
    await loadAllServers(this.pgDeps);
  }
}
