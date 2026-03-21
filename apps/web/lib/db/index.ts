import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Sql } from 'postgres';

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

export function detectSsl(url: string): false | { rejectUnauthorized: boolean } {
  const needsSsl =
    url.includes('sslmode=require') ||
    url.includes('sslmode=verify-full') ||
    url.includes('sslmode=verify-ca') ||
    process.env['DATABASE_SSL'] === 'true';
  if (!needsSsl) return false;
  return { rejectUnauthorized: process.env['DATABASE_SSL_REJECT_UNAUTHORIZED'] !== 'false' };
}

let sqlClient: Sql | null = null;
let dbInstance: DrizzleClient | null = null;

export function getDb(): DrizzleClient {
  if (dbInstance === null) {
    const url = getConnectionString();
    const ssl = detectSsl(url);
    sqlClient = postgres(url, {
      max: getPoolSize(),
      idle_timeout: 20,
      connect_timeout: 10,
      // Disable prepared statements for PgBouncer transaction-mode compatibility
      prepare: false,
      ssl,
    });
    dbInstance = drizzle(sqlClient, { schema });
  }
  return dbInstance;
}

let readDbInstance: DrizzleClient | null = null;
let readSqlClient: Sql | null = null;

export function getReadDb(): DrizzleClient {
  const readUrl = process.env['DATABASE_READ_URL'];
  if (!readUrl) return getDb();
  if (readDbInstance === null) {
    const ssl = detectSsl(readUrl);
    readSqlClient = postgres(readUrl, {
      max: getPoolSize(),
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      ssl,
    });
    readDbInstance = drizzle(readSqlClient, { schema });
  }
  return readDbInstance;
}

export async function closeDb(): Promise<void> {
  if (sqlClient) {
    await sqlClient.end();
    sqlClient = null;
    dbInstance = null;
  }
  if (readSqlClient) {
    await readSqlClient.end();
    readSqlClient = null;
    readDbInstance = null;
  }
}
