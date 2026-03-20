import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { specs } from './specs';

export const mcpServers = pgTable(
  'mcp_servers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    specId: uuid('spec_id')
      .references(() => specs.id, { onDelete: 'cascade' })
      .notNull(),
    userId: text('user_id').notNull(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    transport: text('transport', { enum: ['sse', 'streamable-http'] }).default('sse').notNull(),
    authMode: text('auth_mode', { enum: ['none', 'api_key', 'bearer'] }).notNull(),
    baseUrl: text('base_url').notNull(),
    rateLimitPerMinute: integer('rate_limit').default(100).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('idx_servers_user_id').on(table.userId),
    specIdIdx: index('idx_servers_spec_id').on(table.specId),
    slugIdx: uniqueIndex('idx_servers_user_slug').on(table.userId, table.slug),
    // Partial index idx_servers_active_user (WHERE is_active = true) defined in migration only
  }),
);
