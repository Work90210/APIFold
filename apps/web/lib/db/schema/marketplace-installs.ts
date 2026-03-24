import { pgTable, uuid, text, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';

import { marketplaceListings } from './marketplace-listings';
import { mcpServers } from './servers';
import { specs } from './specs';

export const marketplaceInstalls = pgTable(
  'marketplace_installs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    listingId: uuid('listing_id')
      .references(() => marketplaceListings.id)
      .notNull(),
    userId: text('user_id').notNull(),
    serverId: uuid('server_id')
      .references(() => mcpServers.id, { onDelete: 'cascade' })
      .notNull(),
    specId: uuid('spec_id')
      .references(() => specs.id, { onDelete: 'cascade' })
      .notNull(),
    installedVersionHash: text('installed_version_hash').notNull(),
    isUpdateAvailable: boolean('is_update_available').notNull().default(false),
    listingSuspended: boolean('listing_suspended').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    listingUserIdx: uniqueIndex('idx_mi_listing_user').on(table.listingId, table.userId),
    userIdx: index('idx_mi_user').on(table.userId),
    serverIdx: index('idx_mi_server').on(table.serverId),
  }),
);
