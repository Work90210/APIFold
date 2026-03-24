import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';

import { marketplaceListings } from './marketplace-listings';

export const marketplaceAuditLog = pgTable(
  'marketplace_audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    listingId: uuid('listing_id')
      .references(() => marketplaceListings.id),
    actorId: text('actor_id').notNull(),
    action: text('action', {
      enum: ['approved', 'rejected', 'suspended', 'unsuspended', 'featured', 'unfeatured'],
    }).notNull(),
    reason: text('reason').notNull(),
    previousStatus: text('previous_status').notNull(),
    newStatus: text('new_status').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    listingIdx: index('idx_mal_listing').on(table.listingId),
  }),
);
