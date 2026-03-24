import { pgTable, uuid, text, timestamp, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';

import { marketplaceListings } from './marketplace-listings';

export const marketplaceVersions = pgTable(
  'marketplace_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    listingId: uuid('listing_id')
      .references(() => marketplaceListings.id, { onDelete: 'cascade' })
      .notNull(),
    version: text('version').notNull(),
    specHash: text('spec_hash').notNull(),
    rawSpec: text('raw_spec').notNull(),
    changelog: text('changelog'),
    toolCount: integer('tool_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    listingVersionIdx: uniqueIndex('idx_mv_listing_version').on(table.listingId, table.version),
    listingIdx: index('idx_mv_listing').on(table.listingId),
  }),
);
