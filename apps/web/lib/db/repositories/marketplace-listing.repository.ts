import { eq, and, sql, desc, asc } from 'drizzle-orm';

import type { BrowseMarketplaceInput } from '../../validation/marketplace.schema';
import type { DrizzleClient } from '../index';
import { marketplaceListings } from '../schema/marketplace-listings';

export type MarketplaceListing = typeof marketplaceListings.$inferSelect;

export interface BrowseResult {
  readonly items: readonly MarketplaceListing[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
}

export interface CategoryCount {
  readonly category: string;
  readonly count: number;
}

export class MarketplaceListingRepository {
  constructor(private readonly db: DrizzleClient) {}

  async findPublishedBySlug(slug: string): Promise<MarketplaceListing | null> {
    const rows = await this.db
      .select()
      .from(marketplaceListings)
      .where(
        and(
          eq(marketplaceListings.slug, slug),
          eq(marketplaceListings.status, 'published'),
        ),
      )
      .limit(1);

    return rows[0] ? Object.freeze(rows[0]) : null;
  }

  async findBySlug(slug: string): Promise<MarketplaceListing | null> {
    const rows = await this.db
      .select()
      .from(marketplaceListings)
      .where(eq(marketplaceListings.slug, slug))
      .limit(1);

    return rows[0] ? Object.freeze(rows[0]) : null;
  }

  async findById(id: string): Promise<MarketplaceListing | null> {
    const rows = await this.db
      .select()
      .from(marketplaceListings)
      .where(eq(marketplaceListings.id, id))
      .limit(1);

    return rows[0] ? Object.freeze(rows[0]) : null;
  }

  async searchPublished(params: BrowseMarketplaceInput): Promise<BrowseResult> {
    const conditions = [eq(marketplaceListings.status, 'published')];

    if (params.category) {
      conditions.push(eq(marketplaceListings.category, params.category));
    }

    if (params.author_type) {
      conditions.push(eq(marketplaceListings.authorType, params.author_type));
    }

    const whereClause = and(...conditions);
    const offset = (params.page - 1) * params.limit;

    // Count total
    const [countRow] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(marketplaceListings)
      .where(whereClause);

    const total = countRow?.count ?? 0;

    // Build query with search and sorting
    let query = this.db
      .select()
      .from(marketplaceListings)
      .where(whereClause)
      .limit(params.limit)
      .offset(offset);

    // Full-text search via plainto_tsquery
    if (params.q) {
      const searchCondition = sql`to_tsvector('english', ${marketplaceListings.name} || ' ' || ${marketplaceListings.shortDescription} || ' ' || array_to_string(${marketplaceListings.tags}, ' ')) @@ plainto_tsquery('english', ${params.q})`;
      query = this.db
        .select()
        .from(marketplaceListings)
        .where(and(whereClause, searchCondition))
        .limit(params.limit)
        .offset(offset);
    }

    // Sort
    const orderBy =
      params.sort === 'newest'
        ? desc(marketplaceListings.createdAt)
        : params.sort === 'name'
          ? asc(marketplaceListings.name)
          : desc(marketplaceListings.installCount);

    const items = await query.orderBy(orderBy);

    return Object.freeze({
      items: Object.freeze(items.map((row) => Object.freeze(row))),
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit),
    });
  }

  async findFeatured(limit: number = 6): Promise<readonly MarketplaceListing[]> {
    const rows = await this.db
      .select()
      .from(marketplaceListings)
      .where(
        and(
          eq(marketplaceListings.status, 'published'),
          eq(marketplaceListings.featured, true),
        ),
      )
      .orderBy(desc(marketplaceListings.installCount))
      .limit(limit);

    return Object.freeze(rows.map((row) => Object.freeze(row)));
  }

  async findCategoriesWithCounts(): Promise<readonly CategoryCount[]> {
    const rows = await this.db
      .select({
        category: marketplaceListings.category,
        count: sql<number>`count(*)::int`,
      })
      .from(marketplaceListings)
      .where(eq(marketplaceListings.status, 'published'))
      .groupBy(marketplaceListings.category)
      .orderBy(desc(sql`count(*)`));

    return Object.freeze(rows.map((row) => Object.freeze(row)));
  }

  async findByAuthor(authorId: string): Promise<readonly MarketplaceListing[]> {
    const rows = await this.db
      .select()
      .from(marketplaceListings)
      .where(eq(marketplaceListings.authorId, authorId))
      .orderBy(desc(marketplaceListings.updatedAt));

    return Object.freeze(rows.map((row) => Object.freeze(row)));
  }

  async findPendingReview(): Promise<readonly MarketplaceListing[]> {
    const rows = await this.db
      .select()
      .from(marketplaceListings)
      .where(eq(marketplaceListings.status, 'pending_review'))
      .orderBy(asc(marketplaceListings.updatedAt));

    return Object.freeze(rows.map((row) => Object.freeze(row)));
  }

  async incrementInstallCount(
    tx: DrizzleClient,
    listingId: string,
  ): Promise<void> {
    await tx
      .update(marketplaceListings)
      .set({
        installCount: sql`${marketplaceListings.installCount} + 1`,
      })
      .where(eq(marketplaceListings.id, listingId));
  }

  async updateStatus(
    tx: DrizzleClient,
    id: string,
    values: Partial<typeof marketplaceListings.$inferInsert>,
  ): Promise<MarketplaceListing> {
    const rows = await tx
      .update(marketplaceListings)
      .set(values)
      .where(eq(marketplaceListings.id, id))
      .returning();

    if (rows.length === 0) {
      throw new Error('Listing not found');
    }

    return Object.freeze(rows[0]!);
  }
}
