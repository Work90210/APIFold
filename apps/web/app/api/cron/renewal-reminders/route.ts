import { NextResponse, type NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/email/cron-auth";
import { acquireCronLock, releaseCronLock } from "@/lib/email/cron-lock";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const lockToken = await acquireCronLock("renewal-reminders", 300);
  if (!lockToken) {
    return NextResponse.json({ ok: true, skipped: "lock_held" });
  }

  try {
    // TODO: Implement renewal reminder logic
    return NextResponse.json({ ok: true, reminders: 0 });
  } catch (err) {
    console.error("[cron] renewal-reminders failed:", err);
    return NextResponse.json(
      { error: "Reminders failed" },
      { status: 500 },
    );
  } finally {
    await releaseCronLock("renewal-reminders", lockToken);
  }
}

export { POST as GET };
