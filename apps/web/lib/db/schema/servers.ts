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
    endpointId: text('endpoint_id').notNull(),
    name: text('name').notNull(),
    transport: text('transport', { enum: ['sse', 'streamable-http'] }).default('sse').notNull(),
    authMode: text('auth_mode', { enum: ['none', 'api_key', 'bearer', 'oauth2_authcode', 'oauth2_client_creds'] }).notNull(),
    baseUrl: text('base_url').notNull(),
    rateLimitPerMinute: integer('rate_limit').default(100).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    customDomain: text('custom_domain'),
    domainVerifiedAt: timestamp('domain_verified_at', { withTimezone: true }),
    domainVerificationToken: text('domain_verification_token'),
    tokenHash: text('token_hash'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('idx_servers_user_id').on(table.userId),
    specIdIdx: index('idx_servers_spec_id').on(table.specId),
    slugIdx: uniqueIndex('idx_servers_user_slug').on(table.userId, table.slug),
    endpointIdIdx: uniqueIndex('idx_servers_endpoint_id').on(table.endpointId),
    // idx_servers_custom_domain is a partial index (WHERE custom_domain IS NOT NULL)
    // defined only in migration 0006. Drizzle cannot express partial indexes.
  }),
);
