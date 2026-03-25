import { NextResponse, type NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { verifyCronSecret } from "@/lib/email/cron-auth";
import { acquireCronLock, releaseCronLock } from "@/lib/email/cron-lock";
import { getDb } from "@/lib/db";

const OUTBOX_RETENTION_DAYS = 90;
const EVENTS_RETENTION_DAYS = 180;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const lockAcquired = await acquireCronLock("email-cleanup", 300);
  if (!lockAcquired) {
    return NextResponse.json({ ok: true, skipped: "lock_held" });
  }

  try {
    const db = getDb();

    const outboxCutoff = new Date(
      Date.now() - OUTBOX_RETENTION_DAYS * 86_400_000,
    );
    await db.execute(sql`
      DELETE FROM email_attempts WHERE outbox_id IN (
        SELECT id FROM email_outbox
        WHERE status IN ('sent', 'failed', 'suppressed')
          AND created_at < ${outboxCutoff.toISOString()}
      )
    `);
    await db.execute(sql`
      DELETE FROM email_outbox
      WHERE status IN ('sent', 'failed', 'suppressed')
        AND created_at < ${outboxCutoff.toISOString()}
    `);

    const eventsCutoff = new Date(
      Date.now() - EVENTS_RETENTION_DAYS * 86_400_000,
    );
    await db.execute(sql`
      DELETE FROM email_events
      WHERE created_at < ${eventsCutoff.toISOString()}
    `);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[cron] email-cleanup failed:", err);
    return NextResponse.json(
      { error: "Cleanup failed" },
      { status: 500 },
    );
  } finally {
    await releaseCronLock("email-cleanup");
  }
}

export { POST as GET };
