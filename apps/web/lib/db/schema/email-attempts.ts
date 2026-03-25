import {
  pgTable,
  uuid,
  integer,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { emailOutbox } from "./email-outbox";

export const emailAttempts = pgTable(
  "email_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    outboxId: uuid("outbox_id")
      .references(() => emailOutbox.id, { onDelete: "cascade" })
      .notNull(),
    attemptNumber: integer("attempt_number").notNull(),
    requestSnapshot: jsonb("request_snapshot")
      .notNull()
      .$type<Record<string, unknown>>(),
    responseSnapshot: jsonb("response_snapshot").$type<Record<
      string,
      unknown
    > | null>(),
    outcome: text("outcome", {
      enum: ["success", "retryable_failure", "permanent_failure"],
    }).notNull(),
    errorCode: text("error_code"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    outboxIdIdx: index("idx_email_attempts_outbox_id").on(table.outboxId),
  }),
);
