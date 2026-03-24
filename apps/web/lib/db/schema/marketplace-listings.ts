import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const marketplaceListings = pgTable(
  'marketplace_listings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    shortDescription: text('short_description').notNull(),
    longDescription: text('long_description').notNull(),
    category: text('category').notNull(),
    tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
    iconUrl: text('icon_url'),
    authorId: text('author_id').notNull(),
    authorType: text('author_type', {
      enum: ['official', 'community', 'verified'],
    }).notNull().default('community'),
    rawSpec: jsonb('raw_spec').notNull().$type<Record<string, unknown>>(),
    specVersion: text('spec_version').notNull(),
    recommendedBaseUrl: text('recommended_base_url').notNull(),
    recommendedAuthMode: text('recommended_auth_mode', {
      enum: ['none', 'api_key', 'bearer'],
    }).notNull(),
    defaultToolFilter: jsonb('default_tool_filter').$type<Record<string, boolean> | null>(),
    setupGuide: text('setup_guide'),
    apiDocsUrl: text('api_docs_url'),
    status: text('status', {
      enum: ['draft', 'pending_review', 'published', 'rejected', 'suspended'],
    }).notNull().default('draft'),
    reviewNotes: text('review_notes'),
    reviewedBy: text('reviewed_by'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    installCount: integer('install_count').notNull().default(0),
    featured: boolean('featured').notNull().default(false),
    specHash: text('spec_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex('idx_ml_slug').on(table.slug),
    statusIdx: index('idx_ml_status').on(table.status),
    categoryIdx: index('idx_ml_category').on(table.category),
    authorIdx: index('idx_ml_author').on(table.authorId),
    featuredIdx: index('idx_ml_featured').on(table.featured),
    // GIN full-text search index is created via raw SQL migration
    // since Drizzle cannot express expression-based GIN indexes
  }),
);
