import { NextResponse, type NextRequest } from 'next/server';
import { createSuccessResponse } from '@apifold/types';
import { getDb } from '../../../../../lib/db/index';
import { LogRepository } from '../../../../../lib/db/repositories/log.repository';
import { getUserId, withErrorHandler, withRateLimit } from '../../../../../lib/api-helpers';
import { uuidParam } from '../../../../../lib/validation/common.schema';

type RouteParams = { params: Promise<{ id: string }> };

export function GET(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { id: serverId } = await context.params;
    uuidParam.parse(serverId);

    const db = getDb();
    const logRepo = new LogRepository(db);
    const logs = await logRepo.findAll(userId, { serverId });

    // The useLogs hook expects { logs, cursor, hasMore } for infinite query pagination.
    // The repository currently returns all logs in one page (no cursor-based pagination),
    // so we return cursor: null and hasMore: false.
    return NextResponse.json(
      createSuccessResponse({ logs, cursor: null, hasMore: false }),
    );
  });
}
