import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createSuccessResponse } from '@apifold/types';
import { getUserId, withErrorHandler, withRateLimit, ApiError, errorResponse } from '../../../../lib/api-helpers';
import { ErrorCodes } from '@apifold/types';
import { getDb } from '../../../../lib/db/index';
import { ServerRepository } from '../../../../lib/db/repositories/server.repository';
import { getProviderPreset } from '../../../../lib/oauth/providers';
import { generatePkceChallenge, generateState } from '../../../../lib/oauth/pkce';
import { storeOAuthState } from '../../../../lib/oauth/state-store';

import { encryptCredential } from '../../../../lib/vault/index';

const authorizeSchema = z.object({
  serverId: z.string().uuid(),
  provider: z.string().min(1).max(100),
  clientId: z.string().min(1).max(500),
  clientSecret: z.string().min(1).max(10000),
  scopes: z.array(z.string().max(200)).max(50).optional(),
});

function buildCallbackUrl(request: NextRequest): string {
  const url = new URL(request.url);
  return `${url.origin}/api/oauth/callback`;
}

export function POST(request: NextRequest): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const input = authorizeSchema.parse(body);

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

    // Generate PKCE challenge and state
    const pkce = generatePkceChallenge();
    const state = generateState();
    const scopes = input.scopes ?? [...preset.defaultScopes];

    // Store state in Redis for callback validation.
    // Client credentials are encrypted before storage to protect them at rest in Redis.
    await storeOAuthState(state, {
      serverId: input.serverId,
      userId,
      provider: input.provider,
      codeVerifier: pkce.codeVerifier,
      scopes,
      tokenEndpoint: preset.tokenEndpoint,
      encryptedClientId: encryptCredential(input.clientId),
      encryptedClientSecret: encryptCredential(input.clientSecret),
      createdAt: Date.now(),
    });

    // Build authorization URL
    const authUrl = new URL(preset.authorizationEndpoint);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', input.clientId);
    authUrl.searchParams.set('redirect_uri', buildCallbackUrl(request));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', pkce.codeChallenge);
    authUrl.searchParams.set('code_challenge_method', pkce.codeChallengeMethod);

    if (scopes.length > 0) {
      authUrl.searchParams.set('scope', scopes.join(preset.scopeSeparator));
    }

    return NextResponse.json(
      createSuccessResponse({
        authorizationUrl: authUrl.toString(),
        state,
      }),
    );
  });
}
