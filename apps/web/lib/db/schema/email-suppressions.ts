import {
  pgTable,
  uuid,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const emailSuppressions = pgTable(
  "email_suppressions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    reason: text("reason", {
      enum: ["hard_bounce", "complaint"],
    }).notNull(),
    providerEventId: text("provider_event_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex("idx_email_suppressions_email").on(table.email),
  }),
);
