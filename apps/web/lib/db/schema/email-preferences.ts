import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const emailPreferences = pgTable("email_preferences", {
  userId: text("user_id").primaryKey(),
  weeklyUsageSummary: boolean("weekly_usage_summary").notNull().default(true),
  monthlyUsageSummary: boolean("monthly_usage_summary")
    .notNull()
    .default(false),
  renewalReminder: boolean("renewal_reminder").notNull().default(true),
  usageLimitWarning: boolean("usage_limit_warning").notNull().default(true),
  budgetCapWarning: boolean("budget_cap_warning").notNull().default(true),
  overageAlert: boolean("overage_alert").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
