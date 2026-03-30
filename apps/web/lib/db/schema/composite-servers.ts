import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { mcpServers } from './servers';

export const compositeServers = pgTable(
  'composite_servers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    slug: text('slug').notNull(),
    endpointId: text('endpoint_id').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    transport: text('transport', { enum: ['sse', 'streamable-http'] }).default('sse').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    tokenHash: text('token_hash'),
    workspaceId: uuid('workspace_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userSlugIdx: uniqueIndex('idx_composite_user_slug').on(table.userId, table.slug),
    endpointIdIdx: uniqueIndex('idx_composite_endpoint_id').on(table.endpointId),
    userIdIdx: index('idx_composite_user_id').on(table.userId),
  }),
);

export const compositeMembers = pgTable(
  'composite_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    compositeId: uuid('composite_id')
      .references(() => compositeServers.id, { onDelete: 'cascade' })
      .notNull(),
    serverId: uuid('server_id')
      .references(() => mcpServers.id, { onDelete: 'cascade' })
      .notNull(),
    namespace: text('namespace').notNull(),
    displayOrder: integer('display_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    memberUniqueIdx: uniqueIndex('idx_composite_member_unique').on(table.compositeId, table.serverId),
    namespaceUniqueIdx: uniqueIndex('idx_composite_namespace_unique').on(table.compositeId, table.namespace),
    compositeIdx: index('idx_composite_members_composite').on(table.compositeId),
  }),
);
