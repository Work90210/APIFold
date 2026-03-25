import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const emailOutbox = pgTable(
  "email_outbox",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id"),
    toEmail: text("to_email").notNull(),
    category: text("category", {
      enum: ["transactional", "billing", "usage", "security"],
    }).notNull(),
    type: text("type", {
      enum: [
        "welcome",
        "subscription_confirmed",
        "plan_changed",
        "subscription_cancelled",
        "payment_failed",
        "renewal_reminder",
        "usage_limit_warning",
        "overage_alert",
        "weekly_usage_summary",
        "monthly_usage_summary",
        "budget_cap_warning",
        "new_login_alert",
        "password_change_alert",
        "account_deleted",
      ],
    }).notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    provider: text("provider", { enum: ["resend"] })
      .notNull()
      .default("resend"),
    templateVersion: text("template_version").notNull().default("v1"),
    payload: jsonb("payload").notNull().$type<Record<string, unknown>>(),
    headers: jsonb("headers").notNull().$type<Record<string, string>>(),
    status: text("status", {
      enum: ["pending", "processing", "sent", "failed", "suppressed"],
    })
      .notNull()
      .default("pending"),
    priority: integer("priority").notNull().default(2),
    sendAfter: timestamp("send_after", { withTimezone: true })
      .defaultNow()
      .notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    providerMessageId: text("provider_message_id"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idempotencyKeyIdx: uniqueIndex("idx_email_outbox_idempotency_key").on(
      table.idempotencyKey,
    ),
    statusSendAfterIdx: index("idx_email_outbox_status_send_after").on(
      table.status,
      table.sendAfter,
      table.priority,
    ),
    providerMessageIdIdx: index("idx_email_outbox_provider_message_id").on(
      table.providerMessageId,
    ),
    userIdIdx: index("idx_email_outbox_user_id").on(table.userId),
  }),
);
