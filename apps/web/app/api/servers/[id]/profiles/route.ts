import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createSuccessResponse, ErrorCodes } from '@apifold/types';
import { getDb } from '../../../../../lib/db/index';
import { ProfileRepository } from '../../../../../lib/db/repositories/profile.repository';
import { getUserId, withErrorHandler, withRateLimit, errorResponse } from '../../../../../lib/api-helpers';
import { uuidParam } from '../../../../../lib/validation/common.schema';

type RouteParams = { params: Promise<{ id: string }> };

const createProfileSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(500).optional(),
  toolIds: z.array(z.string().uuid()).min(1),
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  toolIds: z.array(z.string().uuid()).min(1).optional(),
});

export function GET(_request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { id: serverId } = await context.params;
    uuidParam.parse(serverId);

    const db = getDb();
    const profileRepo = new ProfileRepository(db);
    const profiles = await profileRepo.findAll(userId, { serverId });

    return NextResponse.json(createSuccessResponse(profiles));
  });
}

export function POST(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { id: serverId } = await context.params;
    uuidParam.parse(serverId);

    const body = await request.json();
    const input = createProfileSchema.parse(body);

    const db = getDb();
    const profileRepo = new ProfileRepository(db);
    const profile = await profileRepo.create(userId, {
      serverId,
      ...input,
    });

    return NextResponse.json(createSuccessResponse(profile), { status: 201 });
  });
}

export function PUT(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { id: serverId } = await context.params;
    uuidParam.parse(serverId);

    const url = new URL(request.url);
    const profileId = url.searchParams.get('profileId');
    if (!profileId) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'profileId query parameter required', 400);
    }
    uuidParam.parse(profileId);

    const body = await request.json();
    const input = updateProfileSchema.parse(body);

    const db = getDb();
    const profileRepo = new ProfileRepository(db);
    const profile = await profileRepo.update(userId, profileId, input);

    return NextResponse.json(createSuccessResponse(profile));
  });
}

export function DELETE(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { id: serverId } = await context.params;
    uuidParam.parse(serverId);

    const url = new URL(request.url);
    const profileId = url.searchParams.get('profileId');
    if (!profileId) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'profileId query parameter required', 400);
    }
    uuidParam.parse(profileId);

    const db = getDb();
    const profileRepo = new ProfileRepository(db);
    await profileRepo.delete(userId, profileId);

    return NextResponse.json(createSuccessResponse({ deleted: true }));
  });
}
