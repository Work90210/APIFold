import { randomUUID } from 'node:crypto';

import type { Response } from 'express';

import type { Logger } from '../observability/logger.js';
import { metrics } from '../observability/metrics.js';
import type { ConnectionMonitor } from '../resilience/connection-monitor.js';

/**
 * Maximum bytes a single SSE response is allowed to buffer before we consider
 * the client "slow" and terminate the connection. Node.js internally buffers
 * writes when the kernel TCP send buffer is full — if we don't cap this, a
 * slow client can silently eat megabytes of heap per connection.
 *
 * 256 KB is generous for SSE (heartbeats are ~14 bytes each).
 */
const MAX_BUFFERED_BYTES = 256 * 1024;

export interface SSESession {
  readonly id: string;
  readonly slug: string;
  readonly clientIp: string;
  readonly profileSlug?: string;
  readonly profileToolIds?: readonly string[];
  readonly createdAt: number;
  lastActivityAt: number;
  readonly res: Response;
  readonly authenticated: boolean;
}

export interface SessionProfileContext {
  readonly slug?: string;
  readonly toolIds: readonly string[];
}

export interface SessionManagerDeps {
  readonly logger: Logger;
  readonly connectionMonitor: ConnectionMonitor;
  readonly maxSessions: number;
  readonly heartbeatIntervalMs: number;
  readonly idleTimeoutMs: number;
}

export class SessionManager {
  private readonly sessions = new Map<string, SSESession>();
  private readonly logger: Logger;
  private readonly monitor: ConnectionMonitor;
  private readonly maxSessions: number;
  private readonly heartbeatIntervalMs: number;
  private readonly idleTimeoutMs: number;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(deps: SessionManagerDeps) {
    this.logger = deps.logger;
    this.monitor = deps.connectionMonitor;
    this.maxSessions = deps.maxSessions;
    this.heartbeatIntervalMs = deps.heartbeatIntervalMs;
    this.idleTimeoutMs = deps.idleTimeoutMs;
  }

  start(): void {
    this.heartbeatTimer = setInterval(() => this.heartbeat(), this.heartbeatIntervalMs);
    this.cleanupTimer = setInterval(() => this.cleanup(), this.idleTimeoutMs);
    this.logger.info('Session manager started');
  }

  stop(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  hasCapacity(): boolean {
    return this.sessions.size < this.maxSessions;
  }

  create(slug: string, res: Response, clientIp: string, authenticated: boolean = false, profile?: SessionProfileContext): SSESession | null {
    if (!this.hasCapacity()) {
      this.logger.warn({ slug, maxSessions: this.maxSessions }, 'Max sessions reached');
      return null;
    }

    const now = Date.now();
    const session: SSESession = {
      id: randomUUID(),
      slug,
      clientIp,
      profileSlug: profile?.slug,
      profileToolIds: profile?.toolIds,
      createdAt: now,
      lastActivityAt: now,
      res,
      authenticated,
    };

    this.sessions.set(session.id, session);
    this.monitor.onSessionCreated(slug);
    metrics.incrementGauge('active_sse_connections');

    // Clean up on client disconnect (guard against double-decrement if close() was called first)
    res.on('close', () => {
      if (this.sessions.has(session.id)) {
        this.sessions.delete(session.id);
        this.monitor.onSessionClosed(slug);
        metrics.decrementGauge('active_sse_connections');
        this.logger.debug({ sessionId: session.id, slug }, 'SSE session client disconnected');
      }
    });

    return session;
  }

  close(sessionId: string, reason: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    this.sendEvent(session, 'close', JSON.stringify({ reason }));
    session.res.end();
    this.sessions.delete(sessionId);
    this.monitor.onSessionClosed(session.slug);
    metrics.decrementGauge('active_sse_connections');
    this.logger.debug({ sessionId, slug: session.slug, reason }, 'SSE session closed');
  }

  closeAllForServer(slug: string): void {
    const toClose = [...this.sessions.entries()]
      .filter(([, session]) => session.slug === slug)
      .map(([id]) => id);
    for (const id of toClose) {
      this.close(id, 'server_removed');
    }
  }

  get(sessionId: string): SSESession | undefined {
    return this.sessions.get(sessionId);
  }

  touch(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivityAt = Date.now();
    }
  }

  sendEvent(session: SSESession, event: string, data: string): void {
    if (session.res.writableEnded) return;

    // Check backpressure: if Node.js has buffered too much unsent data for this
    // client, the client is too slow — terminate instead of letting heap grow.
    const buffered = session.res.writableLength;
    if (buffered > MAX_BUFFERED_BYTES) {
      this.logger.warn(
        { sessionId: session.id, slug: session.slug, bufferedBytes: buffered },
        'SSE client too slow, closing connection due to backpressure',
      );
      metrics.incrementCounter('sse_backpressure_kills');
      session.res.end();
      return;
    }

    const safeEvent = event.replace(/[\r\n]/g, '');
    const safeData = data.replace(/\r\n|\r|\n/g, '\ndata: ');
    session.res.write(`event: ${safeEvent}\ndata: ${safeData}\n\n`);
  }

  get size(): number {
    return this.sessions.size;
  }

  async drainAll(timeoutMs: number): Promise<void> {
    this.logger.info({ sessionCount: this.sessions.size }, 'Draining all SSE sessions');

    const allIds = [...this.sessions.keys()];
    for (const id of allIds) {
      this.close(id, 'server_shutdown');
    }

    // Brief pause to allow close events to flush to clients
    await new Promise((resolve) => setTimeout(resolve, Math.min(timeoutMs, 2000)));
    this.logger.info('All SSE sessions drained');
  }

  private heartbeat(): void {
    for (const [sessionId, session] of this.sessions) {
      if (session.res.writableEnded) continue;

      // Skip heartbeat for slow clients — let the next cleanup or sendEvent handle eviction
      if (session.res.writableLength > MAX_BUFFERED_BYTES) {
        this.logger.warn(
          { sessionId, slug: session.slug, bufferedBytes: session.res.writableLength },
          'Skipping heartbeat for slow client, closing connection',
        );
        metrics.incrementCounter('sse_backpressure_kills');
        this.close(sessionId, 'slow_client');
        continue;
      }

      session.res.write(':heartbeat\n\n');
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const threshold = now - this.idleTimeoutMs;

    const toClean = [...this.sessions.entries()]
      .filter(([, session]) => session.lastActivityAt < threshold)
      .map(([id]) => id);

    for (const id of toClean) {
      this.close(id, 'idle_timeout');
    }

    if (toClean.length > 0) {
      this.logger.info({ cleaned: toClean.length }, 'Idle SSE sessions cleaned up');
    }
  }
}
