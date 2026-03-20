import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { mcpServers } from './servers';

export const credentials = pgTable(
  'credentials',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    serverId: uuid('server_id')
      .references(() => mcpServers.id, { onDelete: 'cascade' })
      .notNull(),
    userId: text('user_id').notNull(),
    label: text('label').notNull(),
    encryptedKey: text('encrypted_key').notNull(),
    authType: text('auth_type', { enum: ['api_key', 'bearer'] }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    serverIdIdx: index('idx_credentials_server_id').on(table.serverId),
    userIdIdx: index('idx_credentials_user_id').on(table.userId),
    serverUserIdx: index('idx_credentials_server_user').on(table.serverId, table.userId),
  }),
);
