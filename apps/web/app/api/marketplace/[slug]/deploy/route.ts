import { createSuccessResponse } from '@apifold/types';
import { NextResponse, type NextRequest } from 'next/server';

import { getUserId, getUserPlan, withErrorHandler, withRateLimit, ApiError } from '../../../../../lib/api-helpers';
import { checkServerLimit } from '../../../../../lib/billing/plan-enforcer';
import { deployListing } from '../../../../../lib/services/marketplace-service';

export function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { slug } = await params;

    // Check plan limits before deploy
    const plan = await getUserPlan(userId);
    const serverLimit = await checkServerLimit(userId, plan);
    if (!serverLimit.allowed) {
      throw new ApiError(
        'PLAN_LIMIT',
        `Server limit reached (${serverLimit.current}/${serverLimit.max}). Upgrade your plan to deploy more marketplace servers.`,
        403,
      );
    }

    const result = await deployListing(slug, userId);

    return NextResponse.json(createSuccessResponse(result), { status: 201 });
  });
}
