import { NextResponse, type NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/email/cron-auth";
import { acquireCronLock, releaseCronLock } from "@/lib/email/cron-lock";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const lockAcquired = await acquireCronLock("renewal-reminders", 300);
  if (!lockAcquired) {
    return NextResponse.json({ ok: true, skipped: "lock_held" });
  }

  try {
    // TODO: Implement renewal reminder logic
    // 1. List Stripe subscriptions renewing in 7 days and 1 day
    // 2. Map customer IDs to user IDs
    // 3. Enqueue renewal reminder emails with deterministic idempotency keys
    return NextResponse.json({ ok: true, reminders: 0 });
  } catch (err) {
    console.error("[cron] renewal-reminders failed:", err);
    return NextResponse.json(
      { error: "Reminders failed" },
      { status: 500 },
    );
  } finally {
    await releaseCronLock("renewal-reminders");
  }
}

export { POST as GET };
