import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const emailEvents = pgTable(
  "email_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: text("provider", { enum: ["resend"] })
      .notNull()
      .default("resend"),
    providerEventId: text("provider_event_id").notNull(),
    providerMessageId: text("provider_message_id"),
    eventType: text("event_type", {
      enum: [
        "sent",
        "delivered",
        "bounced",
        "complained",
        "opened",
        "clicked",
      ],
    }).notNull(),
    payload: jsonb("payload").notNull().$type<Record<string, unknown>>(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    providerEventIdx: uniqueIndex("idx_email_events_provider_event").on(
      table.provider,
      table.providerEventId,
    ),
    providerMessageIdx: index("idx_email_events_provider_message").on(
      table.providerMessageId,
    ),
  }),
);
