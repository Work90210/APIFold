import { NextResponse, type NextRequest } from 'next/server';
import { createSuccessResponse } from '@apifold/types';
import { getDb } from '../../../../../lib/db/index.js';
import { LogRepository } from '../../../../../lib/db/repositories/log.repository.js';
import { getUserId, withErrorHandler, withRateLimit } from '../../../../../lib/api-helpers.js';
import { uuidParam } from '../../../../../lib/validation/common.schema.js';

type RouteParams = { params: Promise<{ id: string }> };

export function GET(_request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { id: serverId } = await context.params;
    uuidParam.parse(serverId);

    const db = getDb();
    const logRepo = new LogRepository(db);
    const logs = await logRepo.findAll(userId, { serverId });

    return NextResponse.json(createSuccessResponse(logs));
  });
}
