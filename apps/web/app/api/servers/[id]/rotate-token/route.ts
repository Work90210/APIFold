import { createSuccessResponse } from '@apifold/types';
import { NextResponse, type NextRequest } from 'next/server';

import { getUserId, withErrorHandler, withRateLimit } from '../../../../../lib/api-helpers';
import { getDb } from '../../../../../lib/db/index';
import { ServerRepository } from '../../../../../lib/db/repositories/server.repository';
import { publishServerEvent } from '../../../../../lib/redis';
import { uuidParam } from '../../../../../lib/validation/common.schema';

type RouteParams = { params: Promise<{ id: string }> };

export function POST(_request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { id } = await context.params;
    uuidParam.parse(id);

    const db = getDb();
    const serverRepo = new ServerRepository(db);
    const { server, token } = await serverRepo.rotateToken(userId, id);

    // Publish event so runtime instances hot-reload the new token hash
    await publishServerEvent({
      type: 'server:updated',
      serverId: server.id,
      slug: server.slug,
    });

    return NextResponse.json(
      createSuccessResponse({
        token,
        tokenWarning: 'This token will not be shown again.' as const,
      }),
    );
  });
}
