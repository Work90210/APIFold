import { NextResponse, type NextRequest } from 'next/server';
import { createSuccessResponse, ErrorCodes } from '@apifold/types';
import { getDb } from '../../../../lib/db/index';
import { ServerRepository } from '../../../../lib/db/repositories/server.repository';
import { getUserId, withErrorHandler, withRateLimit, errorResponse } from '../../../../lib/api-helpers';
import { updateServerSchema } from '../../../../lib/validation/server.schema';
import { uuidParam } from '../../../../lib/validation/common.schema';
import { publishServerEvent } from '../../../../lib/redis';

type RouteParams = { params: Promise<{ id: string }> };

export function GET(_request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { id } = await context.params;
    uuidParam.parse(id);

    const db = getDb();
    const serverRepo = new ServerRepository(db);
    const server = await serverRepo.findById(userId, id);

    if (!server) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Server not found', 404);
    }

    return NextResponse.json(createSuccessResponse(server));
  });
}

export function PATCH(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { id } = await context.params;
    uuidParam.parse(id);

    const body = await request.json();
    const input = updateServerSchema.parse(body);

    const db = getDb();
    const serverRepo = new ServerRepository(db);
    const server = await serverRepo.update(userId, id, input);

    await publishServerEvent({
      type: 'server:updated',
      serverId: server.id,
    });

    return NextResponse.json(createSuccessResponse(server));
  });
}

export function DELETE(_request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { id } = await context.params;
    uuidParam.parse(id);

    const db = getDb();
    const serverRepo = new ServerRepository(db);
    const server = await serverRepo.findById(userId, id);

    if (!server) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Server not found', 404);
    }

    await serverRepo.delete(userId, id);

    await publishServerEvent({
      type: 'server:deleted',
      serverId: id,
      slug: server.slug,
    });

    return NextResponse.json(createSuccessResponse({ deleted: true }));
  });
}
