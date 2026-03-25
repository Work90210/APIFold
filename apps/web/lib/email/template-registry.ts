import { createElement, type ReactElement } from "react";

import { AccountDeletedEmail } from "./templates/account-deleted";
import { BudgetCapWarningEmail } from "./templates/budget-cap-warning";
import { MonthlySummaryEmail } from "./templates/monthly-summary";
import { OverageAlertEmail } from "./templates/overage-alert";
import { PaymentFailedEmail } from "./templates/payment-failed";
import { PlanChangedEmail } from "./templates/plan-changed";
import { RenewalReminderEmail } from "./templates/renewal-reminder";
import { SecurityAlertEmail } from "./templates/security-alert";
import { SubscriptionCancelledEmail } from "./templates/subscription-cancelled";
import { SubscriptionConfirmedEmail } from "./templates/subscription-confirmed";
import { UsageWarningEmail } from "./templates/usage-warning";
import { WeeklySummaryEmail } from "./templates/weekly-summary";
import { WelcomeEmail } from "./templates/welcome";
import type { EmailType } from "./types";

interface TemplateDefinition {
  readonly subject: (payload: Record<string, unknown>) => string;
  readonly render: (payload: Record<string, unknown>) => ReactElement;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const REGISTRY: Readonly<Record<EmailType, TemplateDefinition>> = {
  welcome: {
    subject: () => "Welcome to APIFold",
    render: (p) => createElement(WelcomeEmail, p as any),
  },
  subscription_confirmed: {
    subject: (p) => `Your ${p.planName} subscription is active`,
    render: (p) => createElement(SubscriptionConfirmedEmail, p as any),
  },
  plan_changed: {
    subject: (p) => `Plan changed to ${p.newPlan}`,
    render: (p) => createElement(PlanChangedEmail, p as any),
  },
  subscription_cancelled: {
    subject: () => "Your subscription has been cancelled",
    render: (p) => createElement(SubscriptionCancelledEmail, p as any),
  },
  payment_failed: {
    subject: () => "Payment issue with your APIFold subscription",
    render: (p) => createElement(PaymentFailedEmail, p as any),
  },
  renewal_reminder: {
    subject: (p) => `Your ${p.planName} plan renews on ${p.renewalDate}`,
    render: (p) => createElement(RenewalReminderEmail, p as any),
  },
  usage_limit_warning: {
    subject: (p) => `Usage alert — ${p.percentage}% of your limit reached`,
    render: (p) => createElement(UsageWarningEmail, p as any),
  },
  budget_cap_warning: {
    subject: (p) => `Budget alert — ${p.percentage}% of your cap used`,
    render: (p) => createElement(BudgetCapWarningEmail, p as any),
  },
  overage_alert: {
    subject: (p) => `Overage charges of ${p.overageAmount}`,
    render: (p) => createElement(OverageAlertEmail, p as any),
  },
  weekly_usage_summary: {
    subject: () => "Your weekly APIFold summary",
    render: (p) => createElement(WeeklySummaryEmail, p as any),
  },
  monthly_usage_summary: {
    subject: () => "Your monthly APIFold summary",
    render: (p) => createElement(MonthlySummaryEmail, p as any),
  },
  new_login_alert: {
    subject: () => "New login to your APIFold account",
    render: (p) => createElement(SecurityAlertEmail, p as any),
  },
  password_change_alert: {
    subject: () => "Your APIFold password was changed",
    render: (p) => createElement(SecurityAlertEmail, p as any),
  },
  account_deleted: {
    subject: () => "Your APIFold account has been deleted",
    render: (p) => createElement(AccountDeletedEmail, p as any),
  },
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export function getTemplateForType(
  type: EmailType,
): TemplateDefinition | null {
  return REGISTRY[type] ?? null;
}
