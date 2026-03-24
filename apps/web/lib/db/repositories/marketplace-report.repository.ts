import { eq, and, desc } from 'drizzle-orm';

import type { DrizzleClient } from '../index';
import { marketplaceReports } from '../schema/marketplace-reports';

export type MarketplaceReport = typeof marketplaceReports.$inferSelect;

export class MarketplaceReportRepository {
  constructor(private readonly db: DrizzleClient) {}

  async create(
    input: typeof marketplaceReports.$inferInsert,
  ): Promise<MarketplaceReport> {
    const rows = await this.db
      .insert(marketplaceReports)
      .values(input)
      .returning();

    return Object.freeze(rows[0]!);
  }

  async findOpenReports(): Promise<readonly MarketplaceReport[]> {
    const rows = await this.db
      .select()
      .from(marketplaceReports)
      .where(eq(marketplaceReports.status, 'open'))
      .orderBy(desc(marketplaceReports.createdAt));

    return Object.freeze(rows.map((row) => Object.freeze(row)));
  }

  async findByListingId(listingId: string): Promise<readonly MarketplaceReport[]> {
    const rows = await this.db
      .select()
      .from(marketplaceReports)
      .where(eq(marketplaceReports.listingId, listingId))
      .orderBy(desc(marketplaceReports.createdAt));

    return Object.freeze(rows.map((row) => Object.freeze(row)));
  }

  async dismiss(
    id: string,
    reviewedBy: string,
  ): Promise<MarketplaceReport> {
    const rows = await this.db
      .update(marketplaceReports)
      .set({ status: 'dismissed', reviewedBy })
      .where(
        and(
          eq(marketplaceReports.id, id),
          eq(marketplaceReports.status, 'open'),
        ),
      )
      .returning();

    if (rows.length === 0) {
      throw new Error('Report not found or already reviewed');
    }

    return Object.freeze(rows[0]!);
  }
}
