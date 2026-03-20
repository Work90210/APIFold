import { NextResponse, type NextRequest } from 'next/server';
import { createSuccessResponse, ErrorCodes } from '@apifold/types';
import { getDb } from '../../../../lib/db/index';
import { SpecRepository } from '../../../../lib/db/repositories/spec.repository';
import { getUserId, withErrorHandler, withRateLimit, errorResponse } from '../../../../lib/api-helpers';
import { updateSpecSchema } from '../../../../lib/validation/spec.schema';
import { uuidParam } from '../../../../lib/validation/common.schema';

type RouteParams = { params: Promise<{ id: string }> };

export function GET(_request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { id } = await context.params;
    uuidParam.parse(id);

    const db = getDb();
    const specRepo = new SpecRepository(db);
    const spec = await specRepo.findById(userId, id);

    if (!spec) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Spec not found', 404);
    }

    return NextResponse.json(createSuccessResponse(spec));
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
    const input = updateSpecSchema.parse(body);

    const db = getDb();
    const specRepo = new SpecRepository(db);
    const spec = await specRepo.update(userId, id, input);

    return NextResponse.json(createSuccessResponse(spec));
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
    const specRepo = new SpecRepository(db);
    await specRepo.delete(userId, id);

    return NextResponse.json(createSuccessResponse({ deleted: true }));
  });
}
