import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
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
    authType: text('auth_type', {
      enum: ['api_key', 'bearer', 'oauth2_authcode', 'oauth2_client_creds'],
    }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),

    // OAuth 2.0 columns
    encryptedRefreshToken: text('encrypted_refresh_token'),
    scopes: text('scopes').array().default(sql`'{}'`),
    tokenEndpoint: text('token_endpoint'),
    clientId: text('client_id'),
    encryptedClientSecret: text('encrypted_client_secret'),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    provider: text('provider'),
  },
  (table) => ({
    serverIdIdx: index('idx_credentials_server_id').on(table.serverId),
    userIdIdx: index('idx_credentials_user_id').on(table.userId),
    serverUserIdx: index('idx_credentials_server_user').on(table.serverId, table.userId),
    // idx_credentials_provider is a partial index (WHERE provider IS NOT NULL).
    // It is defined only in migration 0003_oauth_credentials.sql because
    // Drizzle ORM cannot express partial indexes. DO NOT add it here.
  }),
);
