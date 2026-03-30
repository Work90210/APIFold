import { createSuccessResponse } from '@apifold/types';
import { NextResponse, type NextRequest } from 'next/server';

import { getUserId, withErrorHandler, withRateLimit } from '../../../../../lib/api-helpers';
import { getDb } from '../../../../../lib/db/index';
import { uuidParam } from '../../../../../lib/validation/common.schema';
import { mcpServers } from '../../../../../lib/db/schema/index';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

type RouteParams = { params: Promise<{ id: string }> };

interface WebhookEventRow extends Record<string, unknown> {
  readonly id: string;
  readonly event_name: string;
  readonly payload: unknown;
  readonly received_at: string;
}

export function GET(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { id: serverId } = await context.params;
    uuidParam.parse(serverId);

    const db = getDb();

    // Verify user owns this server
    const server = await db
      .select({ id: mcpServers.id })
      .from(mcpServers)
      .where(and(eq(mcpServers.id, serverId), eq(mcpServers.userId, userId)))
      .limit(1);

    if (server.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Server not found' },
        { status: 404 },
      );
    }

    const url = new URL(request.url);
    const rawLimit = parseInt(url.searchParams.get('limit') ?? '50', 10);
    const limit = Math.max(1, Math.min(Number.isFinite(rawLimit) ? rawLimit : 50, 200));

    const events = await db.execute<WebhookEventRow>(
      sql`SELECT id, event_name, payload, received_at
          FROM webhook_events
          WHERE server_id = ${serverId}
          ORDER BY received_at DESC
          LIMIT ${limit}`,
    );

    const mapped = [...events].map((row) => ({
      id: row.id,
      eventName: row.event_name,
      payload: row.payload,
      receivedAt: row.received_at,
    }));

    return NextResponse.json(createSuccessResponse(mapped));
  });
}
