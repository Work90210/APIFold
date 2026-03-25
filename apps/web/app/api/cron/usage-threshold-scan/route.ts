import { NextResponse, type NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/email/cron-auth";
import { acquireCronLock, releaseCronLock } from "@/lib/email/cron-lock";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const lockAcquired = await acquireCronLock("usage-threshold-scan", 300);
  if (!lockAcquired) {
    return NextResponse.json({ ok: true, skipped: "lock_held" });
  }

  try {
    // TODO: Implement usage threshold scanning
    // 1. Query usage aggregates per user for current billing period
    // 2. Compute threshold crossings (80%, 95%, 100%)
    // 3. Check email_threshold_state for already-sent thresholds
    // 4. Enqueue warnings for new threshold crossings
    return NextResponse.json({ ok: true, scanned: 0 });
  } catch (err) {
    console.error("[cron] usage-threshold-scan failed:", err);
    return NextResponse.json(
      { error: "Scan failed" },
      { status: 500 },
    );
  } finally {
    await releaseCronLock("usage-threshold-scan");
  }
}

export { POST as GET };
