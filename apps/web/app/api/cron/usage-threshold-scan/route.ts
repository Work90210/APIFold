import { NextResponse, type NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/email/cron-auth";
import { acquireCronLock, releaseCronLock } from "@/lib/email/cron-lock";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const lockToken = await acquireCronLock("usage-threshold-scan", 300);
  if (!lockToken) {
    return NextResponse.json({ ok: true, skipped: "lock_held" });
  }

  try {
    // TODO: Implement usage threshold scanning
    return NextResponse.json({ ok: true, scanned: 0 });
  } catch (err) {
    console.error("[cron] usage-threshold-scan failed:", err);
    return NextResponse.json(
      { error: "Scan failed" },
      { status: 500 },
    );
  } finally {
    await releaseCronLock("usage-threshold-scan", lockToken);
  }
}

export { POST as GET };
