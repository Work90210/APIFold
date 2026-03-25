import { NextResponse, type NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/email/cron-auth";
import { acquireCronLock, releaseCronLock } from "@/lib/email/cron-lock";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const lockAcquired = await acquireCronLock("weekly-summary", 600);
  if (!lockAcquired) {
    return NextResponse.json({ ok: true, skipped: "lock_held" });
  }

  try {
    // TODO: Implement weekly summary generation
    // 1. Determine period: last Monday to this Monday (UTC)
    // 2. Query usage aggregates per user
    // 3. Check preferences (weeklyUsageSummary enabled)
    // 4. Enqueue weekly summary emails
    return NextResponse.json({ ok: true, summaries: 0 });
  } catch (err) {
    console.error("[cron] weekly-summary failed:", err);
    return NextResponse.json(
      { error: "Summary generation failed" },
      { status: 500 },
    );
  } finally {
    await releaseCronLock("weekly-summary");
  }
}

export { POST as GET };
