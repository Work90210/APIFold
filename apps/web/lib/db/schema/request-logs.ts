import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { mcpServers } from './servers';
import { mcpTools } from './tools';

export const requestLogs = pgTable(
  'request_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    serverId: uuid('server_id')
      .references(() => mcpServers.id, { onDelete: 'cascade' })
      .notNull(),
    toolId: uuid('tool_id').references(() => mcpTools.id, { onDelete: 'set null' }),
    userId: text('user_id').notNull(),
    requestId: text('request_id').notNull(),
    method: text('method').notNull(),
    path: text('path').notNull(),
    statusCode: integer('status_code').notNull(),
    durationMs: integer('duration_ms').notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    serverIdIdx: index('idx_logs_server_id').on(table.serverId),
    userIdIdx: index('idx_logs_user_id').on(table.userId),
    timestampIdx: index('idx_logs_timestamp').on(table.timestamp),
    requestIdIdx: index('idx_logs_request_id').on(table.requestId),
    toolIdIdx: index('idx_logs_tool_id').on(table.toolId),
    serverTimestampIdx: index('idx_logs_server_timestamp').on(table.serverId, table.timestamp),
  }),
);
