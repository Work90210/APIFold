import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { emailPreferences } from "@/lib/db/schema/email-preferences";
import { emailSuppressions } from "@/lib/db/schema/email-suppressions";
import { CRITICAL_EMAIL_TYPES, type EmailType } from "./types";

type PreferenceKey =
  | "weeklyUsageSummary"
  | "monthlyUsageSummary"
  | "renewalReminder"
  | "usageLimitWarning"
  | "budgetCapWarning"
  | "overageAlert";

const EMAIL_TYPE_TO_PREFERENCE: Partial<Record<EmailType, PreferenceKey>> = {
  weekly_usage_summary: "weeklyUsageSummary",
  monthly_usage_summary: "monthlyUsageSummary",
  renewal_reminder: "renewalReminder",
  usage_limit_warning: "usageLimitWarning",
  budget_cap_warning: "budgetCapWarning",
  overage_alert: "overageAlert",
};

export async function canSendEmail(
  emailType: EmailType,
  userId: string | null,
  toEmail: string,
): Promise<boolean> {
  if (CRITICAL_EMAIL_TYPES.has(emailType)) return true;

  const db = getDb();
  const suppressed = await db
    .select({ id: emailSuppressions.id })
    .from(emailSuppressions)
    .where(eq(emailSuppressions.email, toEmail))
    .limit(1);

  if (suppressed.length > 0) return false;

  if (!userId) return true;

  const prefKey = EMAIL_TYPE_TO_PREFERENCE[emailType];
  if (!prefKey) return true;

  const prefs = await db
    .select()
    .from(emailPreferences)
    .where(eq(emailPreferences.userId, userId))
    .limit(1);

  if (prefs.length === 0) {
    return prefKey !== "monthlyUsageSummary";
  }

  const userPrefs = prefs[0];
  if (!userPrefs) return true;
  return userPrefs[prefKey] === true;
}
