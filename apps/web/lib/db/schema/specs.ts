import { pgTable, uuid, text, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

export const specs = pgTable(
  'specs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    version: text('version').notNull(),
    sourceUrl: text('source_url'),
    rawSpec: jsonb('raw_spec').notNull().$type<Record<string, unknown>>(),
    toolCount: integer('tool_count').default(0).notNull(),
    currentVersionId: uuid('current_version_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('idx_specs_user_id').on(table.userId),
    userNameIdx: index('idx_specs_user_name').on(table.userId, table.name),
  }),
);
