import { NextResponse, type NextRequest } from 'next/server';
import { createSuccessResponse } from '@apifold/types';
import { getDb } from '../../../../../../lib/db/index';
import { ToolRepository } from '../../../../../../lib/db/repositories/tool.repository';
import { getUserId, withErrorHandler, withRateLimit } from '../../../../../../lib/api-helpers';
import { updateToolSchema } from '../../../../../../lib/validation/tool.schema';
import { uuidParam } from '../../../../../../lib/validation/common.schema';
import { publishServerEvent } from '../../../../../../lib/redis';

type RouteParams = { params: Promise<{ id: string; toolId: string }> };

export function PATCH(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { id: serverId, toolId } = await context.params;
    uuidParam.parse(serverId);
    uuidParam.parse(toolId);

    const body = await request.json();
    const input = updateToolSchema.parse(body);

    const db = getDb();
    const toolRepo = new ToolRepository(db);
    const tool = await toolRepo.update(userId, toolId, input);

    await publishServerEvent({
      type: 'server:updated',
      serverId,
    });

    return NextResponse.json(createSuccessResponse(tool));
  });
}
