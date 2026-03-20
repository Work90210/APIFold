import { NextResponse, type NextRequest } from 'next/server';
import { createSuccessResponse, createPlaintextKey, ErrorCodes } from '@apifold/types';
import { getDb } from '../../../../../lib/db/index';
import { CredentialRepository } from '../../../../../lib/db/repositories/credential.repository';
import { getUserId, withErrorHandler, withRateLimit, errorResponse } from '../../../../../lib/api-helpers';
import { createCredentialSchema } from '../../../../../lib/validation/credential.schema';
import { uuidParam } from '../../../../../lib/validation/common.schema';

type RouteParams = { params: Promise<{ id: string }> };

export function POST(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { id: serverId } = await context.params;
    uuidParam.parse(serverId);

    const body = await request.json();
    const input = createCredentialSchema.parse(body);

    const db = getDb();
    const credentialRepo = new CredentialRepository(db);
    const credential = await credentialRepo.create(userId, {
      serverId,
      label: input.label,
      plaintextKey: createPlaintextKey(input.plaintextKey),
      authType: input.authType,
      expiresAt: input.expiresAt ?? null,
    });

    return NextResponse.json(createSuccessResponse(credential), { status: 201 });
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
    const credentialId = url.searchParams.get('credentialId');
    if (!credentialId) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'credentialId query parameter required', 400);
    }
    uuidParam.parse(credentialId);

    const db = getDb();
    const credentialRepo = new CredentialRepository(db);

    // Verify credential belongs to this server before deleting
    const credential = await credentialRepo.findById(userId, credentialId);
    if (!credential || credential.serverId !== serverId) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Credential not found', 404);
    }

    await credentialRepo.delete(userId, credentialId);

    return NextResponse.json(createSuccessResponse({ deleted: true }));
  });
}
