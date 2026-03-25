import {
  pgTable,
  uuid,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const emailThresholdState = pgTable(
  "email_threshold_state",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    thresholdType: text("threshold_type", {
      enum: ["usage_limit", "budget_cap", "overage"],
    }).notNull(),
    thresholdKey: text("threshold_key").notNull(),
    billingPeriod: text("billing_period").notNull(),
    lastSentAt: timestamp("last_sent_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uniqueThresholdIdx: uniqueIndex("idx_email_threshold_unique").on(
      table.userId,
      table.thresholdType,
      table.thresholdKey,
      table.billingPeriod,
    ),
  }),
);
