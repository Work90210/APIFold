import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema/index';

export type DrizzleClient = PostgresJsDatabase<typeof schema>;

function getConnectionString(): string {
  const url = process.env['DATABASE_URL'];
  if (!url) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  return url;
}

const MAX_POOL_SIZE = 100;

function getPoolSize(): number {
  const size = process.env['DATABASE_POOL_MAX'];
  if (size) {
    const parsed = parseInt(size, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return Math.min(parsed, MAX_POOL_SIZE);
    }
  }
  return 20;
}

let dbInstance: DrizzleClient | null = null;

export function getDb(): DrizzleClient {
  if (dbInstance === null) {
    const sql = postgres(getConnectionString(), {
      max: getPoolSize(),
      idle_timeout: 20,
      connect_timeout: 10,
      // Disable prepared statements for PgBouncer transaction-mode compatibility
      prepare: false,
    });
    dbInstance = drizzle(sql, { schema });
  }
  return dbInstance;
}
