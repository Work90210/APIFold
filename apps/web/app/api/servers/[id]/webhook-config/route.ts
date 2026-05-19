import { createSuccessResponse, ErrorCodes } from '@apifold/types';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { getUserId, withErrorHandler, withRateLimit, errorResponse } from '../../../../../lib/api-helpers';
import { getDb } from '../../../../../lib/db/index';
import { ServerRepository } from '../../../../../lib/db/repositories/server.repository';
import { encryptCredential } from '../../../../../lib/vault/index';
import { publishServerEvent } from '../../../../../lib/redis';
import { uuidParam } from '../../../../../lib/validation/common.schema';

type RouteParams = { params: Promise<{ id: string }> };

const VALID_PROVIDERS = ['stripe', 'github', 'slack', 'generic'] as const;

const webhookConfigSchema = z.object({
  provider: z.enum(VALID_PROVIDERS),
  secret: z.string().min(8, 'Webhook secret must be at least 8 characters'),
});

/** GET — returns current webhook config status (provider only, never the secret). */
export function GET(_request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { id } = await context.params;
    uuidParam.parse(id);

    const db = getDb();
    const serverRepo = new ServerRepository(db);
    const server = await serverRepo.findById(userId, id);

    if (!server) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Server not found', 404);
    }

    return NextResponse.json(
      createSuccessResponse({
        configured: server.webhookProvider !== null,
        provider: server.webhookProvider,
      }),
    );
  });
}

/** POST — set or rotate the webhook secret. Returns the plaintext secret once. */
export function POST(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { id } = await context.params;
    uuidParam.parse(id);

    const body = await request.json();
    const { provider, secret } = webhookConfigSchema.parse(body);

    const db = getDb();
    const serverRepo = new ServerRepository(db);
    const encrypted = encryptCredential(secret);
    const server = await serverRepo.setWebhookConfig(userId, id, provider, encrypted);

    await publishServerEvent({
      type: 'server:updated',
      serverId: server.id,
    });

    return NextResponse.json(
      createSuccessResponse({
        provider,
        secretWarning: 'This secret will not be shown again.' as const,
      }),
    );
  });
}

/** DELETE — remove webhook signature validation for this server. */
export function DELETE(_request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { id } = await context.params;
    uuidParam.parse(id);

    const db = getDb();
    const serverRepo = new ServerRepository(db);
    const server = await serverRepo.clearWebhookConfig(userId, id);

    await publishServerEvent({
      type: 'server:updated',
      serverId: server.id,
    });

    return NextResponse.json(createSuccessResponse({ cleared: true }));
  });
}
