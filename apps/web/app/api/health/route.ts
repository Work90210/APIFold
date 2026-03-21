import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';

import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  let dbStatus: 'ok' | 'error' = 'ok';

  try {
    const db = getDb();
    await db.execute(sql`SELECT 1`);
  } catch {
    dbStatus = 'error';
  }

  const status = dbStatus === 'ok' ? 'ok' : 'degraded';
  const statusCode = dbStatus === 'ok' ? 200 : 503;

  return NextResponse.json(
    {
      status,
      db: dbStatus,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode },
  );
}
