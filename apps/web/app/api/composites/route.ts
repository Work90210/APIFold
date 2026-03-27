import { createSuccessResponse } from '@apifold/types';
import type { CreateCompositeInput } from '@apifold/types';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { getUserId, withErrorHandler, withRateLimit } from '../../../lib/api-helpers';
import { getDb } from '../../../lib/db/index';
import { CompositeRepository } from '../../../lib/db/repositories/composite.repository';

const createSchema = z.object({
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  transport: z.enum(['sse', 'streamable-http']).optional(),
  members: z.array(
    z.object({
      serverId: z.string().uuid(),
      namespace: z.string().min(1).max(30).regex(/^[a-z0-9_]+$/),
      displayOrder: z.number().int().min(0).optional(),
    }),
  ).min(1).max(20),
});

export function GET(_request: NextRequest): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const db = getDb();
    const repo = new CompositeRepository(db);
    const composites = await repo.findAll(userId);

    return NextResponse.json(createSuccessResponse(composites));
  });
}

export function POST(request: NextRequest): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const input = createSchema.parse(body) as CreateCompositeInput;

    const db = getDb();
    const repo = new CompositeRepository(db);
    const result = await repo.create(userId, input);

    return NextResponse.json(createSuccessResponse(result), { status: 201 });
  });
}
