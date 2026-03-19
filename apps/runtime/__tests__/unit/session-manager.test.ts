import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SessionManager } from '../../src/mcp/session-manager.js';
import { ConnectionMonitor } from '../../src/resilience/connection-monitor.js';
import { createTestLogger } from '../helpers.js';
import { EventEmitter } from 'events';

function createMockResponse(): EventEmitter & { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn>; writableEnded: boolean; setHeader: ReturnType<typeof vi.fn>; flushHeaders: ReturnType<typeof vi.fn> } {
  const emitter = new EventEmitter();
  return Object.assign(emitter, {
    write: vi.fn(),
    end: vi.fn(),
    writableEnded: false,
    setHeader: vi.fn(),
    flushHeaders: vi.fn(),
  });
}

describe('SessionManager', () => {
  let manager: SessionManager;
  let monitor: ConnectionMonitor;
  const logger = createTestLogger();

  beforeEach(() => {
    vi.useFakeTimers();
    monitor = new ConnectionMonitor(logger);
    manager = new SessionManager({
      logger,
      connectionMonitor: monitor,
      maxSessions: 3,
      heartbeatIntervalMs: 30_000,
      idleTimeoutMs: 300_000,
    });
  });

  afterEach(() => {
    manager.stop();
    vi.useRealTimers();
  });

  it('creates a session and tracks it', () => {
    const res = createMockResponse();
    const session = manager.create('test-slug', res as never);

    expect(session).not.toBeNull();
    expect(session!.slug).toBe('test-slug');
    expect(manager.size).toBe(1);
  });

  it('returns null when max sessions reached', () => {
    for (let i = 0; i < 3; i++) {
      manager.create(`slug-${i}`, createMockResponse() as never);
    }

    const session = manager.create('extra', createMockResponse() as never);
    expect(session).toBeNull();
  });

  it('closes a session', () => {
    const res = createMockResponse();
    const session = manager.create('slug', res as never)!;

    manager.close(session.id, 'test-reason');

    expect(manager.size).toBe(0);
    expect(res.write).toHaveBeenCalled();
    expect(res.end).toHaveBeenCalled();
  });

  it('closes all sessions for a slug', () => {
    manager.create('target', createMockResponse() as never);
    manager.create('target', createMockResponse() as never);
    manager.create('other', createMockResponse() as never);

    manager.closeAllForServer('target');

    expect(manager.size).toBe(1);
  });

  it('sends heartbeat to all sessions', () => {
    const res1 = createMockResponse();
    const res2 = createMockResponse();
    manager.create('a', res1 as never);
    manager.create('b', res2 as never);
    manager.start();

    vi.advanceTimersByTime(30_000);

    expect(res1.write).toHaveBeenCalledWith(':heartbeat\n\n');
    expect(res2.write).toHaveBeenCalledWith(':heartbeat\n\n');
  });

  it('touch updates lastActivityAt', () => {
    const session = manager.create('slug', createMockResponse() as never)!;
    const initialActivity = session.lastActivityAt;

    vi.advanceTimersByTime(1000);
    manager.touch(session.id);

    expect(session.lastActivityAt).toBeGreaterThan(initialActivity);
  });

  it('get returns session by id', () => {
    const session = manager.create('slug', createMockResponse() as never)!;
    expect(manager.get(session.id)).toBe(session);
    expect(manager.get('nonexistent')).toBeUndefined();
  });

  it('tracks connection stats', () => {
    manager.create('a', createMockResponse() as never);
    const stats = monitor.getStats();
    expect(stats.activeSessions).toBe(1);
    expect(stats.totalCreated).toBe(1);
  });
});
