import { pgTable, uuid, text, boolean, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { mcpServers } from './servers';

export const mcpTools = pgTable(
  'mcp_tools',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    serverId: uuid('server_id')
      .references(() => mcpServers.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    description: text('description'),
    inputSchema: jsonb('input_schema').notNull().$type<Record<string, unknown>>(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    serverIdIdx: index('idx_tools_server_id').on(table.serverId),
    serverNameIdx: uniqueIndex('idx_tools_server_name').on(table.serverId, table.name),
    // Partial index idx_tools_active_server (WHERE is_active = true) defined in migration only
  }),
);
