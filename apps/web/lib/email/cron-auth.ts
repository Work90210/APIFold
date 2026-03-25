import { NextResponse, type NextRequest } from "next/server";

export function verifyCronSecret(
  request: NextRequest,
): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron] CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
