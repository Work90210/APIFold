import { NextResponse, type NextRequest } from 'next/server';
import { createSuccessResponse } from '@apifold/types';
import { getDb } from '../../../../../lib/db/index';
import { ServerRepository } from '../../../../../lib/db/repositories/server.repository';
import { getUserId, withErrorHandler, withRateLimit } from '../../../../../lib/api-helpers';
import { uuidParam } from '../../../../../lib/validation/common.schema';

type RouteParams = { params: Promise<{ id: string }> };

export function GET(_request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { id: specId } = await context.params;
    uuidParam.parse(specId);

    const db = getDb();
    const serverRepo = new ServerRepository(db);
    const servers = await serverRepo.findAll(userId, { specId });

    return NextResponse.json(createSuccessResponse(servers));
  });
}
