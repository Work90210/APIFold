export type EmailCategory =
  | "transactional"
  | "billing"
  | "usage"
  | "security";

export type EmailType =
  | "welcome"
  | "subscription_confirmed"
  | "plan_changed"
  | "subscription_cancelled"
  | "payment_failed"
  | "renewal_reminder"
  | "usage_limit_warning"
  | "overage_alert"
  | "weekly_usage_summary"
  | "monthly_usage_summary"
  | "budget_cap_warning"
  | "new_login_alert"
  | "password_change_alert"
  | "account_deleted";

export const EMAIL_PRIORITIES = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
} as const;

export type EmailPriority = (typeof EMAIL_PRIORITIES)[keyof typeof EMAIL_PRIORITIES];

export type EmailIntent = Readonly<{
  userId: string | null;
  toEmail: string;
  category: EmailCategory;
  type: EmailType;
  idempotencyKey: string;
  templateVersion: string;
  payload: Readonly<Record<string, unknown>>;
  priority: EmailPriority;
  sendAfter: Date;
}>;

/** Email types that cannot be unsubscribed from */
export const CRITICAL_EMAIL_TYPES: ReadonlySet<EmailType> = new Set([
  "welcome",
  "subscription_confirmed",
  "plan_changed",
  "subscription_cancelled",
  "payment_failed",
  "new_login_alert",
  "password_change_alert",
  "account_deleted",
]);
