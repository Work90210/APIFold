import { NextResponse, type NextRequest } from 'next/server';
import { createSuccessResponse, ErrorCodes } from '@apifold/types';
import { getDb } from '../../../../../lib/db/index';
import { SpecVersionRepository } from '../../../../../lib/db/repositories/spec-version.repository';
import { SpecRepository } from '../../../../../lib/db/repositories/spec.repository';
import { getUserId, withErrorHandler, withRateLimit, errorResponse } from '../../../../../lib/api-helpers';
import { uuidParam } from '../../../../../lib/validation/common.schema';
import { createSpecVersionSchema } from '../../../../../lib/validation/spec-version.schema';

type RouteParams = { params: Promise<{ id: string }> };

export function GET(_request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { id: specId } = await context.params;
    uuidParam.parse(specId);

    const db = getDb();
    const specRepo = new SpecRepository(db);
    const spec = await specRepo.findById(userId, specId);

    if (!spec) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Spec not found', 404);
    }

    const versionRepo = new SpecVersionRepository(db);
    const versions = await versionRepo.findAll(userId, { specId });

    return NextResponse.json(createSuccessResponse(versions));
  });
}

export function POST(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { id: specId } = await context.params;
    uuidParam.parse(specId);

    const body = await request.json();
    const input = createSpecVersionSchema.parse(body);

    const db = getDb();
    const specRepo = new SpecRepository(db);
    const spec = await specRepo.findById(userId, specId);

    if (!spec) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Spec not found', 404);
    }

    const versionRepo = new SpecVersionRepository(db);
    const version = await versionRepo.create(userId, {
      specId,
      versionLabel: input.versionLabel,
      rawSpec: input.rawSpec,
      toolSnapshot: input.toolSnapshot,
      sourceUrl: input.sourceUrl,
    });

    return NextResponse.json(createSuccessResponse(version), { status: 201 });
  });
}
