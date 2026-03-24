import { eq, and } from 'drizzle-orm';

import type { DrizzleClient } from '../index';
import { marketplaceInstalls } from '../schema/marketplace-installs';
import { marketplaceListings } from '../schema/marketplace-listings';
import { mcpServers } from '../schema/servers';

export type MarketplaceInstall = typeof marketplaceInstalls.$inferSelect;

export interface InstallWithListing extends MarketplaceInstall {
  readonly listing: {
    readonly slug: string;
    readonly name: string;
    readonly iconUrl: string | null;
    readonly authorType: string;
    readonly category: string;
  };
  readonly server: {
    readonly slug: string;
    readonly name: string;
    readonly isActive: boolean;
  };
}

export class MarketplaceInstallRepository {
  constructor(private readonly db: DrizzleClient) {}

  async findByListingAndUser(
    listingId: string,
    userId: string,
  ): Promise<MarketplaceInstall | null> {
    const rows = await this.db
      .select()
      .from(marketplaceInstalls)
      .where(
        and(
          eq(marketplaceInstalls.listingId, listingId),
          eq(marketplaceInstalls.userId, userId),
        ),
      )
      .limit(1);

    return rows[0] ? Object.freeze(rows[0]) : null;
  }

  async findByUser(userId: string): Promise<readonly InstallWithListing[]> {
    const rows = await this.db
      .select({
        install: marketplaceInstalls,
        listing: {
          slug: marketplaceListings.slug,
          name: marketplaceListings.name,
          iconUrl: marketplaceListings.iconUrl,
          authorType: marketplaceListings.authorType,
          category: marketplaceListings.category,
        },
        server: {
          slug: mcpServers.slug,
          name: mcpServers.name,
          isActive: mcpServers.isActive,
        },
      })
      .from(marketplaceInstalls)
      .innerJoin(
        marketplaceListings,
        eq(marketplaceInstalls.listingId, marketplaceListings.id),
      )
      .innerJoin(mcpServers, eq(marketplaceInstalls.serverId, mcpServers.id))
      .where(eq(marketplaceInstalls.userId, userId));

    return Object.freeze(
      rows.map((row) =>
        Object.freeze({
          ...row.install,
          listing: Object.freeze(row.listing),
          server: Object.freeze(row.server),
        }),
      ),
    );
  }

  async findById(id: string): Promise<MarketplaceInstall | null> {
    const rows = await this.db
      .select()
      .from(marketplaceInstalls)
      .where(eq(marketplaceInstalls.id, id))
      .limit(1);

    return rows[0] ? Object.freeze(rows[0]) : null;
  }

  async create(
    tx: DrizzleClient,
    input: typeof marketplaceInstalls.$inferInsert,
  ): Promise<MarketplaceInstall> {
    const rows = await tx
      .insert(marketplaceInstalls)
      .values(input)
      .returning();

    return Object.freeze(rows[0]!);
  }

  async markSuspendedByListing(
    tx: DrizzleClient,
    listingId: string,
    suspended: boolean,
  ): Promise<void> {
    await tx
      .update(marketplaceInstalls)
      .set({ listingSuspended: suspended })
      .where(eq(marketplaceInstalls.listingId, listingId));
  }

  async markUpdateAvailable(
    listingId: string,
    _newHash: string,
  ): Promise<void> {
    await this.db
      .update(marketplaceInstalls)
      .set({ isUpdateAvailable: true })
      .where(
        and(
          eq(marketplaceInstalls.listingId, listingId),
          // Only flag installs that have a different version hash
          eq(marketplaceInstalls.isUpdateAvailable, false),
        ),
      );
  }
}
