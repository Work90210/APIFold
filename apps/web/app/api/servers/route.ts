import { createSuccessResponse } from '@apifold/types';
import { NextResponse, type NextRequest } from 'next/server';

import { getUserId, getUserPlan, withErrorHandler, withRateLimit, ApiError } from '../../../lib/api-helpers';
import { checkServerLimit } from '../../../lib/billing/plan-enforcer';
import { getDb } from '../../../lib/db/index';
import { ServerRepository } from '../../../lib/db/repositories/server.repository';
import { publishServerEvent } from '../../../lib/redis';
import { createServerSchema } from '../../../lib/validation/server.schema';
import { serverTrackServerCreated } from '../../../lib/analytics/events.server';

export function GET(_request: NextRequest): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const db = getDb();
    const serverRepo = new ServerRepository(db);
    const servers = await serverRepo.findAll(userId);

    // Strip tokenHash from response — never expose hash to client
    const safeServers = servers.map((s) => {
      const { tokenHash: _omit, ...rest } = s as unknown as Record<string, unknown>;
      return rest;
    });
    return NextResponse.json(createSuccessResponse(safeServers));
  });
}

export function POST(request: NextRequest): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const plan = await getUserPlan(userId);
    const serverLimit = await checkServerLimit(userId, plan);
    if (!serverLimit.allowed) {
      throw new ApiError(
        'PLAN_LIMIT',
        `Server limit reached (${serverLimit.current}/${serverLimit.max}). Upgrade your plan for more servers.`,
        403,
      );
    }

    const body = await request.json();
    const input = createServerSchema.parse(body);

    const db = getDb();
    const serverRepo = new ServerRepository(db);
    const result = await serverRepo.create(userId, input);

    await publishServerEvent({
      type: 'server:created',
      serverId: result.id,
      slug: result.slug,
    });

    await serverTrackServerCreated({
      userId,
      serverId: result.id,
      slug: result.slug,
      source: 'manual',
    });

    // Return server data + plaintext token (shown once, never stored)
    // Strip tokenHash from response — only return the plaintext token
    const { token, ...serverWithHash } = result;
    const { tokenHash: _omit, ...server } = serverWithHash as Record<string, unknown>;
    return NextResponse.json(
      createSuccessResponse({
        ...server,
        token,
        tokenWarning: 'This token will not be shown again.' as const,
      }),
      { status: 201 },
    );
  });
}
