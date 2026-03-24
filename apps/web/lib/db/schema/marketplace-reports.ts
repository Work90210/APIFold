import { pgTable, uuid, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';

import { marketplaceListings } from './marketplace-listings';

export const marketplaceReports = pgTable(
  'marketplace_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    listingId: uuid('listing_id')
      .references(() => marketplaceListings.id)
      .notNull(),
    reporterId: text('reporter_id').notNull(),
    reason: text('reason', {
      enum: ['broken', 'misleading', 'security', 'spam', 'other'],
    }).notNull(),
    details: text('details').notNull(),
    status: text('status', {
      enum: ['open', 'reviewed', 'dismissed'],
    }).notNull().default('open'),
    reviewedBy: text('reviewed_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    listingIdx: index('idx_mrp_listing').on(table.listingId),
    statusIdx: index('idx_mrp_status').on(table.status),
    userListingIdx: uniqueIndex('idx_mrp_user_listing').on(table.reporterId, table.listingId),
  }),
);
