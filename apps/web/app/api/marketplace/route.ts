import { createSuccessResponse } from '@apifold/types';
import { NextResponse, type NextRequest } from 'next/server';

import { withErrorHandler } from '../../../lib/api-helpers';
import { getReadDb } from '../../../lib/db/index';
import { MarketplaceListingRepository } from '../../../lib/db/repositories/marketplace-listing.repository';
import * as marketplaceCache from '../../../lib/marketplace/cache';
import { browseMarketplaceSchema } from '../../../lib/validation/marketplace.schema';

export function GET(request: NextRequest): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const params = browseMarketplaceSchema.parse(searchParams);

    const cacheKey = marketplaceCache.buildBrowseKey(params);
    const cached = await marketplaceCache.getCached(cacheKey);
    if (cached) {
      return NextResponse.json(createSuccessResponse(cached));
    }

    const db = getReadDb();
    const listingRepo = new MarketplaceListingRepository(db);
    const result = await listingRepo.searchPublished(params);

    await marketplaceCache.setCached(cacheKey, result, 'browse');

    return NextResponse.json(
      createSuccessResponse(result.items, {
        total: result.total,
        page: result.page,
        limit: result.limit,
        hasMore: result.page < result.totalPages,
      }),
    );
  });
}
