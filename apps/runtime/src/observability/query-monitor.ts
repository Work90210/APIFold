import type { Logger } from './logger.js';
import type { DbClient } from '../sync/postgres-loader.js';

const SLOW_QUERY_THRESHOLD_MS = 100;

export interface QueryMonitorOptions {
  readonly logger: Logger;
  readonly db: DbClient;
  readonly slowThresholdMs?: number;
}

/**
 * Wraps a DbClient to log slow queries (those exceeding the threshold).
 * Returns a new DbClient — the original is not mutated.
 */
export function createMonitoredDb(options: QueryMonitorOptions): DbClient {
  const { logger, db, slowThresholdMs = SLOW_QUERY_THRESHOLD_MS } = options;

  return {
    async query<T>(
      sql: string,
      params?: readonly unknown[],
    ): Promise<{ readonly rows: readonly T[] }> {
      const start = performance.now();

      try {
        const result = await db.query<T>(sql, params);
        const durationMs = performance.now() - start;

        if (durationMs > slowThresholdMs) {
          logger.warn(
            {
              durationMs: Math.round(durationMs),
              query: truncateQuery(sql),
              paramCount: params?.length ?? 0,
            },
            'Slow database query detected',
          );
        }

        return result;
      } catch (error) {
        const durationMs = performance.now() - start;

        logger.error(
          {
            durationMs: Math.round(durationMs),
            query: truncateQuery(sql),
            paramCount: params?.length ?? 0,
            err: error,
          },
          'Database query failed',
        );

        throw error;
      }
    },
  };
}

/** Truncate long queries for safe logging (no sensitive data leaks). */
function truncateQuery(sql: string): string {
  const MAX_LENGTH = 200;
  const trimmed = sql.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= MAX_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, MAX_LENGTH)}...`;
}
