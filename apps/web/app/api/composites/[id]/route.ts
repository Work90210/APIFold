import { createSuccessResponse } from '@apifold/types';
import type { UpdateCompositeInput } from '@apifold/types';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { getUserId, withErrorHandler, withRateLimit, NotFoundError } from '../../../../lib/api-helpers';
import { getDb } from '../../../../lib/db/index';
import { CompositeRepository } from '../../../../lib/db/repositories/composite.repository';
import { uuidParam } from '../../../../lib/validation/common.schema';

type RouteParams = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  transport: z.enum(['sse', 'streamable-http']).optional(),
  isActive: z.boolean().optional(),
  members: z.array(
    z.object({
      serverId: z.string().uuid(),
      namespace: z.string().min(1).max(30).regex(/^[a-z0-9_]+$/),
      displayOrder: z.number().int().min(0).optional(),
    }),
  ).min(1).max(20).optional(),
});

export function GET(_request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { id } = await context.params;
    uuidParam.parse(id);

    const db = getDb();
    const repo = new CompositeRepository(db);
    const composite = await repo.findByIdWithMembers(userId, id);

    if (!composite) throw new NotFoundError('Composite server not found');

    return NextResponse.json(createSuccessResponse(composite));
  });
}

export function PUT(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { id } = await context.params;
    uuidParam.parse(id);

    const body = await request.json();
    const input = updateSchema.parse(body) as UpdateCompositeInput;

    const db = getDb();
    const repo = new CompositeRepository(db);
    const updated = await repo.update(userId, id, input);

    return NextResponse.json(createSuccessResponse(updated));
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
    const repo = new CompositeRepository(db);
    await repo.delete(userId, id);

    return NextResponse.json(createSuccessResponse(null));
  });
}
