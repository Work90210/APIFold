import type { Logger } from '../observability/logger.js';
import { metrics } from '../observability/metrics.js';

export interface ConnectionStats {
  readonly activeSessions: number;
  readonly totalCreated: number;
  readonly totalClosed: number;
}

export class ConnectionMonitor {
  private activeSessions = 0;
  private totalCreated = 0;
  private totalClosed = 0;
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  onSessionCreated(slug: string): void {
    this.activeSessions += 1;
    this.totalCreated += 1;
    metrics.incrementCounter('sse_sessions_created_total', { slug });
    this.logger.debug({ slug, activeSessions: this.activeSessions }, 'SSE session created');
  }

  onSessionClosed(slug: string): void {
    this.activeSessions = Math.max(0, this.activeSessions - 1);
    this.totalClosed += 1;
    metrics.incrementCounter('sse_sessions_closed_total', { slug });
    this.logger.debug({ slug, activeSessions: this.activeSessions }, 'SSE session closed');
  }

  getStats(): ConnectionStats {
    return Object.freeze({
      activeSessions: this.activeSessions,
      totalCreated: this.totalCreated,
      totalClosed: this.totalClosed,
    });
  }
}
