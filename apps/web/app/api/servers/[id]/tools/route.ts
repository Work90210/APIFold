import { NextResponse, type NextRequest } from 'next/server';
import { createSuccessResponse } from '@apifold/types';
import { getDb } from '../../../../../lib/db/index.js';
import { ToolRepository } from '../../../../../lib/db/repositories/tool.repository.js';
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
    const toolRepo = new ToolRepository(db);
    const tools = await toolRepo.findAll(userId, { serverId });

    return NextResponse.json(createSuccessResponse(tools));
  });
}
