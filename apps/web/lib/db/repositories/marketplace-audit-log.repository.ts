import { eq, desc } from 'drizzle-orm';

import type { DrizzleClient } from '../index';
import { marketplaceAuditLog } from '../schema/marketplace-audit-log';

export type MarketplaceAuditLogEntry = typeof marketplaceAuditLog.$inferSelect;

export class MarketplaceAuditLogRepository {
  constructor(private readonly db: DrizzleClient) {}

  async append(
    tx: DrizzleClient,
    entry: typeof marketplaceAuditLog.$inferInsert,
  ): Promise<MarketplaceAuditLogEntry> {
    const rows = await tx
      .insert(marketplaceAuditLog)
      .values(entry)
      .returning();

    return Object.freeze(rows[0]!);
  }

  async findByListing(listingId: string): Promise<readonly MarketplaceAuditLogEntry[]> {
    const rows = await this.db
      .select()
      .from(marketplaceAuditLog)
      .where(eq(marketplaceAuditLog.listingId, listingId))
      .orderBy(desc(marketplaceAuditLog.createdAt));

    return Object.freeze(rows.map((row) => Object.freeze(row)));
  }

  async findAll(
    limit: number = 50,
    offset: number = 0,
  ): Promise<readonly MarketplaceAuditLogEntry[]> {
    const rows = await this.db
      .select()
      .from(marketplaceAuditLog)
      .orderBy(desc(marketplaceAuditLog.createdAt))
      .limit(limit)
      .offset(offset);

    return Object.freeze(rows.map((row) => Object.freeze(row)));
  }
}
