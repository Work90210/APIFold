import { createSuccessResponse } from '@apifold/types';
import { NextResponse } from 'next/server';

import { withErrorHandler } from '../../../../lib/api-helpers';
import { getReadDb } from '../../../../lib/db/index';
import { MarketplaceListingRepository } from '../../../../lib/db/repositories/marketplace-listing.repository';
import * as marketplaceCache from '../../../../lib/marketplace/cache';
import { MARKETPLACE_CATEGORIES } from '../../../../lib/marketplace/categories';

export function GET(): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const cacheKey = marketplaceCache.buildCategoriesKey();
    const cached = await marketplaceCache.getCached(cacheKey);
    if (cached) {
      return NextResponse.json(createSuccessResponse(cached));
    }

    const db = getReadDb();
    const listingRepo = new MarketplaceListingRepository(db);
    const counts = await listingRepo.findCategoriesWithCounts();

    // Merge counts with category metadata
    const categories = Object.values(MARKETPLACE_CATEGORIES).map((cat) => {
      const countEntry = counts.find((c) => c.category === cat.slug);
      return {
        ...cat,
        count: countEntry?.count ?? 0,
      };
    });

    await marketplaceCache.setCached(cacheKey, categories, 'categories');

    return NextResponse.json(createSuccessResponse(categories));
  });
}
