import { getAppUrl } from "@/lib/url";
import { EMAIL_PRIORITIES, type EmailIntent } from "./types";

function intent(partial: EmailIntent): Readonly<EmailIntent> {
  return Object.freeze(partial);
}

export function buildWelcomeIntent(
  email: string,
  firstName: string | null,
  clerkEventId: string,
): Readonly<EmailIntent> {
  return intent({
    userId: null,
    toEmail: email,
    category: "transactional",
    type: "welcome",
    idempotencyKey: `welcome:${clerkEventId}`,
    templateVersion: "v1",
    payload: Object.freeze({
      firstName,
      dashboardUrl: `${getAppUrl()}/dashboard`,
    }),
    priority: EMAIL_PRIORITIES.high,
    sendAfter: new Date(),
  });
}

export function buildSubscriptionConfirmedIntent(
  userId: string,
  email: string,
  firstName: string | null,
  planName: string,
  amount: string,
  sessionId: string,
): Readonly<EmailIntent> {
  return intent({
    userId,
    toEmail: email,
    category: "billing",
    type: "subscription_confirmed",
    idempotencyKey: `subscription_confirmed:${sessionId}`,
    templateVersion: "v1",
    payload: Object.freeze({ firstName, planName, amount }),
    priority: EMAIL_PRIORITIES.high,
    sendAfter: new Date(),
  });
}

export function buildPlanChangedIntent(
  userId: string,
  email: string,
  firstName: string | null,
  oldPlan: string,
  newPlan: string,
  subscriptionId: string,
  periodStart: string,
): Readonly<EmailIntent> {
  return intent({
    userId,
    toEmail: email,
    category: "billing",
    type: "plan_changed",
    idempotencyKey: `plan_changed:${subscriptionId}:${periodStart}`,
    templateVersion: "v1",
    payload: Object.freeze({ firstName, oldPlan, newPlan }),
    priority: EMAIL_PRIORITIES.medium,
    sendAfter: new Date(),
  });
}

export function buildSubscriptionCancelledIntent(
  userId: string,
  email: string,
  firstName: string | null,
  planName: string,
  subscriptionId: string,
): Readonly<EmailIntent> {
  return intent({
    userId,
    toEmail: email,
    category: "billing",
    type: "subscription_cancelled",
    idempotencyKey: `subscription_cancelled:${subscriptionId}`,
    templateVersion: "v1",
    payload: Object.freeze({
      firstName,
      planName,
      resubscribeUrl: `${getAppUrl()}/dashboard/settings`,
    }),
    priority: EMAIL_PRIORITIES.high,
    sendAfter: new Date(),
  });
}

export function buildPaymentFailedIntent(
  userId: string,
  email: string,
  firstName: string | null,
  invoiceAmount: string,
  invoiceId: string,
  retryDate: string | null,
): Readonly<EmailIntent> {
  return intent({
    userId,
    toEmail: email,
    category: "billing",
    type: "payment_failed",
    idempotencyKey: `payment_failed:${invoiceId}`,
    templateVersion: "v1",
    payload: Object.freeze({
      firstName,
      invoiceAmount,
      billingUrl: `${getAppUrl()}/dashboard/settings`,
      retryDate,
    }),
    priority: EMAIL_PRIORITIES.critical,
    sendAfter: new Date(),
  });
}

export function buildRenewalReminderIntent(
  userId: string,
  email: string,
  firstName: string | null,
  planName: string,
  renewalDate: string,
  amount: string,
  daysUntilRenewal: number,
): Readonly<EmailIntent> {
  return intent({
    userId,
    toEmail: email,
    category: "billing",
    type: "renewal_reminder",
    idempotencyKey: `renewal_reminder:${userId}:${renewalDate}:${daysUntilRenewal}d`,
    templateVersion: "v1",
    payload: Object.freeze({ firstName, planName, renewalDate, amount }),
    priority: EMAIL_PRIORITIES.medium,
    sendAfter: new Date(),
  });
}

export function buildUsageWarningIntent(
  userId: string,
  email: string,
  firstName: string | null,
  currentUsage: number,
  limit: number,
  thresholdPercent: number,
  billingMonth: string,
): Readonly<EmailIntent> {
  return intent({
    userId,
    toEmail: email,
    category: "usage",
    type: "usage_limit_warning",
    idempotencyKey: `usage_warn:${userId}:${billingMonth}:${thresholdPercent}`,
    templateVersion: "v1",
    payload: Object.freeze({
      firstName,
      currentUsage,
      limit,
      percentage: thresholdPercent,
      upgradeUrl: `${getAppUrl()}/dashboard/settings`,
    }),
    priority: EMAIL_PRIORITIES.high,
    sendAfter: new Date(),
  });
}

export function buildBudgetCapWarningIntent(
  userId: string,
  email: string,
  firstName: string | null,
  currentSpend: number,
  budgetCap: number,
  thresholdPercent: number,
  billingMonth: string,
): Readonly<EmailIntent> {
  return intent({
    userId,
    toEmail: email,
    category: "usage",
    type: "budget_cap_warning",
    idempotencyKey: `budget_cap_warn:${userId}:${billingMonth}:${thresholdPercent}`,
    templateVersion: "v1",
    payload: Object.freeze({
      firstName,
      currentSpend,
      budgetCap,
      percentage: thresholdPercent,
    }),
    priority: EMAIL_PRIORITIES.high,
    sendAfter: new Date(),
  });
}

export function buildOverageAlertIntent(
  userId: string,
  email: string,
  firstName: string | null,
  overageAmount: string,
  billingMonth: string,
): Readonly<EmailIntent> {
  return intent({
    userId,
    toEmail: email,
    category: "usage",
    type: "overage_alert",
    idempotencyKey: `overage_alert:${userId}:${billingMonth}`,
    templateVersion: "v1",
    payload: Object.freeze({ firstName, overageAmount, billingMonth }),
    priority: EMAIL_PRIORITIES.high,
    sendAfter: new Date(),
  });
}

export function buildWeeklySummaryIntent(
  userId: string,
  email: string,
  firstName: string | null,
  periodStart: string,
  periodEnd: string,
  stats: Readonly<{
    totalRequests: number;
    topServers: ReadonlyArray<{ name: string; requests: number }>;
    errorRate: number;
  }>,
): Readonly<EmailIntent> {
  return intent({
    userId,
    toEmail: email,
    category: "usage",
    type: "weekly_usage_summary",
    idempotencyKey: `weekly_summary:${userId}:${periodStart}`,
    templateVersion: "v1",
    payload: Object.freeze({
      firstName,
      periodLabel: `${periodStart} – ${periodEnd}`,
      totalRequests: stats.totalRequests,
      topServers: stats.topServers,
      errorRate: stats.errorRate,
    }),
    priority: EMAIL_PRIORITIES.low,
    sendAfter: new Date(),
  });
}

export function buildMonthlySummaryIntent(
  userId: string,
  email: string,
  firstName: string | null,
  periodStart: string,
  periodEnd: string,
  stats: Readonly<{
    totalRequests: number;
    topServers: ReadonlyArray<{ name: string; requests: number }>;
    errorRate: number;
  }>,
): Readonly<EmailIntent> {
  return intent({
    userId,
    toEmail: email,
    category: "usage",
    type: "monthly_usage_summary",
    idempotencyKey: `monthly_summary:${userId}:${periodStart}`,
    templateVersion: "v1",
    payload: Object.freeze({
      firstName,
      periodLabel: `${periodStart} – ${periodEnd}`,
      totalRequests: stats.totalRequests,
      topServers: stats.topServers,
      errorRate: stats.errorRate,
    }),
    priority: EMAIL_PRIORITIES.low,
    sendAfter: new Date(),
  });
}

export function buildSecurityAlertIntent(
  userId: string,
  email: string,
  firstName: string | null,
  alertType: "new_login" | "password_change",
  details: string,
  eventId: string,
): Readonly<EmailIntent> {
  const type = alertType === "new_login" ? "new_login_alert" : "password_change_alert";
  return intent({
    userId,
    toEmail: email,
    category: "security",
    type,
    idempotencyKey: `security_alert:${userId}:${alertType}:${eventId}`,
    templateVersion: "v1",
    payload: Object.freeze({
      firstName,
      alertType,
      details,
      timestamp: new Date().toISOString(),
    }),
    priority: EMAIL_PRIORITIES.critical,
    sendAfter: new Date(),
  });
}

export function buildAccountDeletedIntent(
  email: string,
  clerkEventId: string,
): Readonly<EmailIntent> {
  return intent({
    userId: null,
    toEmail: email,
    category: "transactional",
    type: "account_deleted",
    idempotencyKey: `account_deleted:${clerkEventId}`,
    templateVersion: "v1",
    payload: Object.freeze({
      email,
      deletedAt: new Date().toISOString(),
    }),
    priority: EMAIL_PRIORITIES.high,
    sendAfter: new Date(),
  });
}
