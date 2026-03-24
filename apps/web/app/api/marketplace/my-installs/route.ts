import { NextResponse } from 'next/server';
import { createSuccessResponse } from '@apifold/types';
import { getDb } from '../../../../lib/db/index';
import { MarketplaceInstallRepository } from '../../../../lib/db/repositories/marketplace-install.repository';
import { getUserId, withErrorHandler, withRateLimit } from '../../../../lib/api-helpers';
import * as marketplaceCache from '../../../../lib/marketplace/cache';

export function GET(): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const cacheKey = marketplaceCache.buildUserInstallsKey(userId);
    const cached = await marketplaceCache.getCached(cacheKey);
    if (cached) {
      return NextResponse.json(createSuccessResponse(cached));
    }

    const db = getDb();
    const installRepo = new MarketplaceInstallRepository(db);
    const installs = await installRepo.findByUser(userId);

    await marketplaceCache.setCached(cacheKey, installs, 'browse');

    return NextResponse.json(createSuccessResponse(installs));
  });
}
