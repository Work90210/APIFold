import { NextResponse, type NextRequest } from 'next/server';
import { createSuccessResponse } from '@apifold/types';
import { getDb } from '../../../lib/db/index.js';
import { ServerRepository } from '../../../lib/db/repositories/server.repository.js';
import { getUserId, withErrorHandler, withRateLimit } from '../../../lib/api-helpers.js';
import { createServerSchema } from '../../../lib/validation/server.schema.js';
import { publishServerEvent } from '../../../lib/redis.js';

export function GET(_request: NextRequest): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const db = getDb();
    const serverRepo = new ServerRepository(db);
    const servers = await serverRepo.findAll(userId);

    return NextResponse.json(createSuccessResponse(servers));
  });
}

export function POST(request: NextRequest): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const input = createServerSchema.parse(body);

    const db = getDb();
    const serverRepo = new ServerRepository(db);
    const server = await serverRepo.create(userId, input);

    await publishServerEvent({
      type: 'server:created',
      serverId: server.id,
      slug: server.slug,
    });

    return NextResponse.json(createSuccessResponse(server), { status: 201 });
  });
}
