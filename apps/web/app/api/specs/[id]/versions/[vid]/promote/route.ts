import { NextResponse, type NextRequest } from 'next/server';
import { createSuccessResponse, ErrorCodes } from '@apifold/types';
import { getDb } from '../../../../../../../lib/db/index';
import { SpecVersionRepository } from '../../../../../../../lib/db/repositories/spec-version.repository';
import { SpecReleaseRepository } from '../../../../../../../lib/db/repositories/spec-release.repository';
import { getUserId, withErrorHandler, withRateLimit, errorResponse } from '../../../../../../../lib/api-helpers';
import { uuidParam } from '../../../../../../../lib/validation/common.schema';
import { promoteVersionSchema } from '../../../../../../../lib/validation/spec-version.schema';

type RouteParams = { params: Promise<{ id: string; vid: string }> };

export function POST(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { id: specId, vid: versionId } = await context.params;
    uuidParam.parse(specId);
    uuidParam.parse(versionId);

    const body = await request.json();
    const input = promoteVersionSchema.parse(body);

    const db = getDb();

    // Verify the version exists and belongs to this spec
    const versionRepo = new SpecVersionRepository(db);
    const version = await versionRepo.findById(userId, versionId);

    if (!version || version.specId !== specId) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Version not found', 404);
    }

    const releaseRepo = new SpecReleaseRepository(db);
    const release = await releaseRepo.create(userId, {
      serverId: input.serverId,
      environment: input.environment,
      versionId,
      endpointUrl: input.endpointUrl,
    });

    return NextResponse.json(createSuccessResponse(release), { status: 201 });
  });
}
