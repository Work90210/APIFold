import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { emailPreferences } from "@/lib/db/schema/email-preferences";

const updateSchema = z.object({
  weeklyUsageSummary: z.boolean().optional(),
  monthlyUsageSummary: z.boolean().optional(),
  renewalReminder: z.boolean().optional(),
  usageLimitWarning: z.boolean().optional(),
  budgetCapWarning: z.boolean().optional(),
  overageAlert: z.boolean().optional(),
});

const DEFAULT_PREFERENCES = {
  weeklyUsageSummary: true,
  monthlyUsageSummary: false,
  renewalReminder: true,
  usageLimitWarning: true,
  budgetCapWarning: true,
  overageAlert: true,
} as const;

export async function GET(): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(emailPreferences)
    .where(eq(emailPreferences.userId, userId))
    .limit(1);

  const prefs = rows[0] ?? { ...DEFAULT_PREFERENCES, userId };

  return NextResponse.json({
    weeklyUsageSummary: prefs.weeklyUsageSummary,
    monthlyUsageSummary: prefs.monthlyUsageSummary,
    renewalReminder: prefs.renewalReminder,
    usageLimitWarning: prefs.usageLimitWarning,
    budgetCapWarning: prefs.budgetCapWarning,
    overageAlert: prefs.overageAlert,
  });
}

export async function PUT(request: Request): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updates = parsed.data;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 },
    );
  }

  const db = getDb();
  await db
    .insert(emailPreferences)
    .values({
      userId,
      ...DEFAULT_PREFERENCES,
      ...updates,
    })
    .onConflictDoUpdate({
      target: emailPreferences.userId,
      set: { ...updates, updatedAt: new Date() },
    });

  return NextResponse.json({ ok: true });
}
