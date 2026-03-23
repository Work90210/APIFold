import { pgTable, uuid, text, integer, boolean, timestamp, index, unique, jsonb } from 'drizzle-orm/pg-core';
import { specs } from './specs';

export const specVersions = pgTable(
  'spec_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    specId: uuid('spec_id')
      .references(() => specs.id, { onDelete: 'cascade' })
      .notNull(),
    versionNumber: integer('version_number').notNull(),
    versionLabel: text('version_label'),
    rawSpec: jsonb('raw_spec').notNull().$type<Record<string, unknown>>(),
    toolSnapshot: jsonb('tool_snapshot').notNull().$type<Record<string, unknown>[]>(),
    toolCount: integer('tool_count').notNull(),
    diffSummary: jsonb('diff_summary').$type<Record<string, unknown>>(),
    isBreaking: boolean('is_breaking').default(false),
    sourceUrl: text('source_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    specIdIdx: index('idx_spec_versions_spec_id').on(table.specId),
    createdAtIdx: index('idx_spec_versions_created_at').on(table.createdAt),
    specVersionUnique: unique('spec_versions_spec_id_version_number_unique').on(
      table.specId,
      table.versionNumber,
    ),
  }),
);
