import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createSuccessResponse, createPlaintextKey, ErrorCodes } from '@apifold/types';
import { getUserId, withErrorHandler, withRateLimit, ApiError, errorResponse } from '../../../../lib/api-helpers';
import { getDb } from '../../../../lib/db/index';
import { ServerRepository } from '../../../../lib/db/repositories/server.repository';
import { CredentialRepository } from '../../../../lib/db/repositories/credential.repository';
import { getProviderPreset } from '../../../../lib/oauth/providers';
import { exchangeClientCredentials } from '../../../../lib/oauth/token-exchange';

const clientCredentialsSchema = z.object({
  serverId: z.string().uuid(),
  provider: z.string().min(1).max(100),
  clientId: z.string().min(1).max(500),
  clientSecret: z.string().min(1).max(10000),
  label: z.string().trim().min(1).max(200),
  scopes: z.array(z.string().max(200)).max(50).optional(),
});

export function POST(request: NextRequest): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const input = clientCredentialsSchema.parse(body);

    // Verify server exists and belongs to user
    const db = getDb();
    const serverRepo = new ServerRepository(db);
    const server = await serverRepo.findById(userId, input.serverId);
    if (!server) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Server not found', 404);
    }

    // Resolve provider preset
    const preset = getProviderPreset(input.provider);
    if (!preset) {
      throw new ApiError(ErrorCodes.VALIDATION_ERROR, `Unknown provider: ${input.provider}`, 400);
    }

    const scopes = input.scopes ?? [...preset.defaultScopes];

    // Exchange client credentials for access token
    const tokenResponse = await exchangeClientCredentials({
      tokenEndpoint: preset.tokenEndpoint,
      clientId: input.clientId,
      clientSecret: input.clientSecret,
      scopes,
      scopeSeparator: preset.scopeSeparator,
    });

    // Calculate token expiry
    const tokenExpiresAt = tokenResponse.expiresIn
      ? new Date(Date.now() + tokenResponse.expiresIn * 1000)
      : null;

    // Store the credential
    const credentialRepo = new CredentialRepository(db);
    const credential = await credentialRepo.create(userId, {
      serverId: input.serverId,
      label: input.label,
      plaintextKey: createPlaintextKey(tokenResponse.accessToken),
      authType: 'oauth2_client_creds',
      scopes,
      tokenEndpoint: preset.tokenEndpoint,
      clientId: input.clientId,
      clientSecret: createPlaintextKey(input.clientSecret),
      tokenExpiresAt,
      provider: input.provider,
    });

    return NextResponse.json(createSuccessResponse(credential), { status: 201 });
  });
}
