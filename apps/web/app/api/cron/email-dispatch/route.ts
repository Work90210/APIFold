import { NextResponse, type NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/email/cron-auth";
import { dispatchBatch } from "@/lib/email/dispatcher";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const result = await dispatchBatch(new Date(), 25);
    return NextResponse.json({
      ok: true,
      processed: result.processed,
      errors: result.errors,
    });
  } catch (err) {
    console.error("[cron] email-dispatch failed:", err);
    return NextResponse.json(
      { error: "Dispatch failed" },
      { status: 500 },
    );
  }
}

export { POST as GET };
