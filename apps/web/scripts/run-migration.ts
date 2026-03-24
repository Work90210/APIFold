import postgres from 'postgres';
import { readFileSync } from 'fs';
import { resolve } from 'path';

async function main() {
  const url = process.env['DATABASE_URL'];
  if (!url) throw new Error('DATABASE_URL required');

  const needsSsl = process.env['DATABASE_SSL'] === 'true';
  const sql = postgres(url, { ssl: needsSsl ? { rejectUnauthorized: process.env['DATABASE_SSL_REJECT_UNAUTHORIZED'] !== 'false' } : false });
  const file = resolve(__dirname, '../lib/db/migrations/0008_marketplace.sql');
  const migration = readFileSync(file, 'utf8');
  const cleaned = migration.replace(/^BEGIN;/m, '').replace(/^COMMIT;/m, '');

  try {
    await sql.unsafe(cleaned);
    console.log('Migration 0008_marketplace applied successfully!');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('Migration failed:', msg);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
