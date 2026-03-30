import { createSuccessResponse } from '@apifold/types';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { getUserId, withErrorHandler, withRateLimit } from '../../../lib/api-helpers';
import { getDb } from '../../../lib/db/index';
import { WorkspaceRepository } from '../../../lib/db/repositories/workspace.repository';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
});

export function GET(_request: NextRequest): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const db = getDb();
    const repo = new WorkspaceRepository(db);
    const workspaces = await repo.findAllForUser(userId);

    return NextResponse.json(createSuccessResponse(workspaces));
  });
}

export function POST(request: NextRequest): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const input = createSchema.parse(body);

    const db = getDb();
    const repo = new WorkspaceRepository(db);
    const workspace = await repo.create(userId, input);

    return NextResponse.json(createSuccessResponse(workspace), { status: 201 });
  });
}
