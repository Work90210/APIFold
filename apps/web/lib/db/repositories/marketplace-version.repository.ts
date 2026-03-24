import { eq, desc } from 'drizzle-orm';

import type { DrizzleClient } from '../index';
import { marketplaceVersions } from '../schema/marketplace-versions';

export type MarketplaceVersion = typeof marketplaceVersions.$inferSelect;

export class MarketplaceVersionRepository {
  constructor(private readonly db: DrizzleClient) {}

  async findByListing(listingId: string): Promise<readonly MarketplaceVersion[]> {
    const rows = await this.db
      .select()
      .from(marketplaceVersions)
      .where(eq(marketplaceVersions.listingId, listingId))
      .orderBy(desc(marketplaceVersions.createdAt));

    return Object.freeze(rows.map((row) => Object.freeze(row)));
  }

  async findByListingAndVersion(
    listingId: string,
    version: string,
  ): Promise<MarketplaceVersion | null> {
    const rows = await this.db
      .select()
      .from(marketplaceVersions)
      .where(
        eq(marketplaceVersions.listingId, listingId),
      )
      .orderBy(desc(marketplaceVersions.createdAt));

    const match = rows.find((r) => r.version === version);
    return match ? Object.freeze(match) : null;
  }

  async create(
    input: typeof marketplaceVersions.$inferInsert,
  ): Promise<MarketplaceVersion> {
    const rows = await this.db
      .insert(marketplaceVersions)
      .values(input)
      .returning();

    return Object.freeze(rows[0]!);
  }
}
