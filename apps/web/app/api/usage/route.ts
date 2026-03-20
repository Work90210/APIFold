import { NextResponse, type NextRequest } from 'next/server';
import { createSuccessResponse } from '@apifold/types';
import { getDb } from '../../../lib/db/index';
import { ServerRepository } from '../../../lib/db/repositories/server.repository';
import { getUserId, withErrorHandler, withRateLimit } from '../../../lib/api-helpers';

export function GET(_request: NextRequest): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const db = getDb();
    const serverRepo = new ServerRepository(db);
    const servers = await serverRepo.findAll(userId);

    return NextResponse.json(createSuccessResponse({
      serverCount: servers.length,
      activeServers: servers.filter((s) => s.isActive).length,
    }));
  });
}
