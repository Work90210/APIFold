import { NextResponse } from 'next/server';
import { createSuccessResponse } from '@apifold/types';
import { getReadDb } from '../../../../lib/db/index';
import { MarketplaceListingRepository } from '../../../../lib/db/repositories/marketplace-listing.repository';
import { withErrorHandler } from '../../../../lib/api-helpers';
import * as marketplaceCache from '../../../../lib/marketplace/cache';

export function GET(): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const cacheKey = marketplaceCache.buildFeaturedKey();
    const cached = await marketplaceCache.getCached(cacheKey);
    if (cached) {
      return NextResponse.json(createSuccessResponse(cached));
    }

    const db = getReadDb();
    const listingRepo = new MarketplaceListingRepository(db);
    const featured = await listingRepo.findFeatured(6);

    await marketplaceCache.setCached(cacheKey, featured, 'featured');

    return NextResponse.json(createSuccessResponse(featured));
  });
}
