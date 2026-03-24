import { createSuccessResponse } from '@apifold/types';
import { NextResponse, type NextRequest } from 'next/server';

import { withErrorHandler, NotFoundError } from '../../../../../lib/api-helpers';
import { getReadDb } from '../../../../../lib/db/index';
import { MarketplaceListingRepository } from '../../../../../lib/db/repositories/marketplace-listing.repository';
import { MarketplaceVersionRepository } from '../../../../../lib/db/repositories/marketplace-version.repository';

export function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const { slug } = await params;

    const db = getReadDb();
    const listingRepo = new MarketplaceListingRepository(db);
    const listing = await listingRepo.findPublishedBySlug(slug);

    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    const versionRepo = new MarketplaceVersionRepository(db);
    const versions = await versionRepo.findByListing(listing.id);

    return NextResponse.json(createSuccessResponse(versions));
  });
}
