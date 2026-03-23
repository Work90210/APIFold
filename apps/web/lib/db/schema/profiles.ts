import { pgTable, uuid, text, boolean, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { mcpServers } from './servers';

export const accessProfiles = pgTable(
  'access_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    serverId: uuid('server_id')
      .references(() => mcpServers.id, { onDelete: 'cascade' })
      .notNull(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    toolIds: uuid('tool_ids').array().notNull().default(sql`'{}'`),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    serverSlugIdx: uniqueIndex('idx_profiles_server_slug').on(table.serverId, table.slug),
    serverIdIdx: index('idx_profiles_server_id').on(table.serverId),
    userIdIdx: index('idx_profiles_user_id').on(table.userId),
  }),
);
