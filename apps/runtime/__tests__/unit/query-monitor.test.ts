import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createMonitoredDb } from '../../src/observability/query-monitor.js';
import type { DbClient } from '../../src/sync/postgres-loader.js';
import type { Logger } from '../../src/observability/logger.js';

function createMockLogger(): Logger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn().mockReturnThis(),
  } as unknown as Logger;
}

function createMockDb(
  queryFn: DbClient['query'] = async () => ({ rows: [] }),
): DbClient {
  return { query: vi.fn(queryFn) };
}

describe('createMonitoredDb', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = createMockLogger();
  });

  it('returns query results unchanged', async () => {
    const expected = { rows: [{ id: '1' }] };
    const db = createMockDb(async () => expected);
    const monitored = createMonitoredDb({ logger, db });

    const result = await monitored.query('SELECT 1');

    expect(result).toBe(expected);
  });

  it('does not warn for fast queries', async () => {
    const db = createMockDb();
    const monitored = createMonitoredDb({ logger, db, slowThresholdMs: 1000 });

    await monitored.query('SELECT 1');

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('warns for slow queries', async () => {
    const db = createMockDb(async () => {
      // Simulate a slow query
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { rows: [] };
    });
    const monitored = createMonitoredDb({ logger, db, slowThresholdMs: 10 });

    await monitored.query('SELECT * FROM users WHERE id = $1', ['abc']);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.stringContaining('SELECT * FROM users'),
        paramCount: 1,
      }),
      'Slow database query detected',
    );
  });

  it('logs and rethrows on query failure', async () => {
    const err = new Error('connection refused');
    const db = createMockDb(async () => {
      throw err;
    });
    const monitored = createMonitoredDb({ logger, db });

    await expect(monitored.query('SELECT 1')).rejects.toThrow('connection refused');
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'SELECT 1',
        err,
      }),
      'Database query failed',
    );
  });

  it('passes params through to underlying db', async () => {
    const db = createMockDb();
    const monitored = createMonitoredDb({ logger, db });

    await monitored.query('SELECT * FROM t WHERE id = $1', ['xyz']);

    expect(db.query).toHaveBeenCalledWith('SELECT * FROM t WHERE id = $1', ['xyz']);
  });

  it('truncates long queries in logs', async () => {
    const longQuery = 'SELECT ' + 'a'.repeat(300) + ' FROM t';
    const db = createMockDb(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { rows: [] };
    });
    const monitored = createMonitoredDb({ logger, db, slowThresholdMs: 10 });

    await monitored.query(longQuery);

    const logCall = (logger.warn as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(logCall[0].query).toHaveLength(203); // 200 chars + '...'
  });
});
