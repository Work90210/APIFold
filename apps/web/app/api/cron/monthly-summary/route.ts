import { NextResponse, type NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/email/cron-auth";
import { acquireCronLock, releaseCronLock } from "@/lib/email/cron-lock";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const lockToken = await acquireCronLock("monthly-summary", 600);
  if (!lockToken) {
    return NextResponse.json({ ok: true, skipped: "lock_held" });
  }

  try {
    // TODO: Implement monthly summary generation — this handler is a placeholder
    // that will be wired up once usage aggregation queries are built.
    return NextResponse.json({
      ok: true,
      implemented: false,
      message: "Not yet implemented",
    });
  } catch (err) {
    console.error("[cron] monthly-summary failed:", err);
    return NextResponse.json(
      { error: "Summary generation failed" },
      { status: 500 },
    );
  } finally {
    await releaseCronLock("monthly-summary", lockToken);
  }
}

export { POST as GET };
