import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { emailPreferences } from "@/lib/db/schema/email-preferences";
import {
  verifyUnsubscribeToken,
  type UnsubscribeScope,
} from "@/lib/email/unsubscribe";
import { getRedis } from "@/lib/redis";

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX = 10;

async function checkIpRateLimit(ip: string): Promise<boolean> {
  try {
    const redis = getRedis();
    const key = `ratelimit:unsubscribe:${ip}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW_SECONDS);
    }
    return count <= RATE_LIMIT_MAX;
  } catch {
    return true; // Fail open
  }
}

const SCOPE_TO_COLUMN: Record<UnsubscribeScope, string> = {
  weekly_usage_summary: "weeklyUsageSummary",
  monthly_usage_summary: "monthlyUsageSummary",
  renewal_reminder: "renewalReminder",
  usage_limit_warning: "usageLimitWarning",
  budget_cap_warning: "budgetCapWarning",
  overage_alert: "overageAlert",
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  const allowed = await checkIpRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 },
    );
  }

  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  if (!body.token || typeof body.token !== "string") {
    return NextResponse.json(
      { error: "Token is required" },
      { status: 400 },
    );
  }

  const claims = verifyUnsubscribeToken(body.token);
  if (!claims) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 400 },
    );
  }

  const column = SCOPE_TO_COLUMN[claims.scope];
  if (!column) {
    return NextResponse.json(
      { error: "Invalid scope" },
      { status: 400 },
    );
  }

  const db = getDb();
  await db
    .insert(emailPreferences)
    .values({
      userId: claims.userId,
      [column]: false,
    })
    .onConflictDoUpdate({
      target: emailPreferences.userId,
      set: { [column]: false, updatedAt: new Date() },
    });

  return NextResponse.json({ ok: true, scope: claims.scope });
}
