import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { mcpServers } from './servers';
import { mcpTools } from './tools';

export const usageEvents = pgTable(
  'usage_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    serverId: uuid('server_id')
      .references(() => mcpServers.id, { onDelete: 'cascade' })
      .notNull(),
    toolId: uuid('tool_id').references(() => mcpTools.id, { onDelete: 'set null' }),
    userId: text('user_id').notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
    durationMs: integer('duration_ms').notNull(),
    statusCode: integer('status_code').notNull(),
    errorCode: text('error_code'),
  },
  (table) => ({
    serverIdIdx: index('idx_usage_server_id').on(table.serverId),
    userIdIdx: index('idx_usage_user_id').on(table.userId),
    timestampIdx: index('idx_usage_timestamp').on(table.timestamp),
    toolIdIdx: index('idx_usage_tool_id').on(table.toolId),
    serverTimestampIdx: index('idx_usage_server_timestamp').on(table.serverId, table.timestamp),
  }),
);
