#!/usr/bin/env tsx
/**
 * Database connectivity check script.
 * Usage: pnpm db:check
 */

import postgres from 'postgres';

const url = process.env['DATABASE_URL'];
if (!url) {
  console.error('ERROR: DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Parse connection info for display (never show password)
let displayInfo: string;
try {
  const parsed = new URL(url);
  const sslMode = parsed.searchParams.get('sslmode') ?? 'none';
  displayInfo = `host=${parsed.hostname} port=${parsed.port || '5432'} db=${parsed.pathname.slice(1)} user=${parsed.username} ssl=${sslMode}`;
} catch {
  displayInfo = '(could not parse URL)';
}

console.log(`Checking database connection: ${displayInfo}`);

const needsSsl =
  url.includes('sslmode=require') ||
  url.includes('sslmode=verify-full') ||
  url.includes('sslmode=verify-ca') ||
  process.env['DATABASE_SSL'] === 'true';
const ssl = needsSsl
  ? { rejectUnauthorized: process.env['DATABASE_SSL_REJECT_UNAUTHORIZED'] !== 'false' }
  : false;

const sql = postgres(url, {
  max: 1,
  connect_timeout: 10,
  ssl,
});

try {
  const result = await sql`SELECT 1 AS ok`;
  if (result[0]?.ok === 1) {
    console.log('SUCCESS: Database connection is healthy');
  } else {
    console.error('ERROR: Unexpected query result');
    process.exit(1);
  }
} catch (err) {
  console.error('ERROR: Database connection failed');
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
} finally {
  await sql.end();
}
