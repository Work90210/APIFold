import { createSuccessResponse } from '@apifold/types';
import { NextResponse, type NextRequest } from 'next/server';

import { withErrorHandler, NotFoundError } from '../../../../lib/api-helpers';
import { getReadDb } from '../../../../lib/db/index';
import { MarketplaceListingRepository } from '../../../../lib/db/repositories/marketplace-listing.repository';
import * as marketplaceCache from '../../../../lib/marketplace/cache';

export function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const { slug } = await params;

    const cacheKey = marketplaceCache.buildDetailKey(slug);
    const cached = await marketplaceCache.getCached(cacheKey);
    if (cached) {
      return NextResponse.json(createSuccessResponse(cached));
    }

    const db = getReadDb();
    const listingRepo = new MarketplaceListingRepository(db);
    const listing = await listingRepo.findPublishedBySlug(slug);

    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    await marketplaceCache.setCached(cacheKey, listing, 'detail');

    return NextResponse.json(createSuccessResponse(listing));
  });
}
