import { NextResponse, type NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/email/cron-auth";
import { acquireCronLock, releaseCronLock } from "@/lib/email/cron-lock";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const lockAcquired = await acquireCronLock("monthly-summary", 600);
  if (!lockAcquired) {
    return NextResponse.json({ ok: true, skipped: "lock_held" });
  }

  try {
    // TODO: Implement monthly summary generation
    // 1. Determine period: 1st to 1st of previous month (UTC)
    // 2. Query usage aggregates per user
    // 3. Check preferences (monthlyUsageSummary enabled)
    // 4. Enqueue monthly summary emails
    return NextResponse.json({ ok: true, summaries: 0 });
  } catch (err) {
    console.error("[cron] monthly-summary failed:", err);
    return NextResponse.json(
      { error: "Summary generation failed" },
      { status: 500 },
    );
  } finally {
    await releaseCronLock("monthly-summary");
  }
}

export { POST as GET };
