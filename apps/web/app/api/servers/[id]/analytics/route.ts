import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createSuccessResponse } from '@apifold/types';
import { getDb } from '../../../../../lib/db/index';
import { getUserId, withErrorHandler, withRateLimit } from '../../../../../lib/api-helpers';
import { uuidParam } from '../../../../../lib/validation/common.schema';
import { usageEvents } from '../../../../../lib/db/schema/usage-events';
import { mcpTools } from '../../../../../lib/db/schema/tools';
import { sql, eq, and, gte, lte, count, avg, desc } from 'drizzle-orm';

type RouteParams = { params: Promise<{ id: string }> };

const timeRangeSchema = z.object({
  range: z.enum(['24h', '7d', '30d']).default('7d'),
});

function getStartDate(range: string): Date {
  const now = new Date();
  switch (range) {
    case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default: return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
}

export function GET(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { id: serverId } = await context.params;
    uuidParam.parse(serverId);

    const url = new URL(request.url);
    const { range } = timeRangeSchema.parse({ range: url.searchParams.get('range') ?? '7d' });
    const startDate = getStartDate(range);

    const db = getDb();

    // Overview stats
    const overviewResult = await db
      .select({
        totalCalls: count(),
        avgDuration: avg(usageEvents.durationMs),
      })
      .from(usageEvents)
      .where(
        and(
          eq(usageEvents.serverId, serverId),
          eq(usageEvents.userId, userId),
          gte(usageEvents.timestamp, startDate),
        ),
      );

    const successResult = await db
      .select({ successCount: count() })
      .from(usageEvents)
      .where(
        and(
          eq(usageEvents.serverId, serverId),
          eq(usageEvents.userId, userId),
          gte(usageEvents.timestamp, startDate),
          lte(usageEvents.statusCode, 399),
        ),
      );

    const errorResult = await db
      .select({ errorCount: count() })
      .from(usageEvents)
      .where(
        and(
          eq(usageEvents.serverId, serverId),
          eq(usageEvents.userId, userId),
          gte(usageEvents.timestamp, startDate),
          gte(usageEvents.statusCode, 400),
        ),
      );

    // Latency percentiles via raw SQL
    const percentileResult = await db.execute(sql`
      SELECT
        COALESCE(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY duration_ms), 0)::INTEGER AS p50,
        COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms), 0)::INTEGER AS p95,
        COALESCE(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms), 0)::INTEGER AS p99
      FROM usage_events
      WHERE server_id = ${serverId}
        AND user_id = ${userId}
        AND timestamp >= ${startDate.toISOString()}::TIMESTAMPTZ
    `);

    // Top 5 tools
    const topToolsResult = await db
      .select({
        toolName: mcpTools.name,
        callCount: count(),
        avgDuration: avg(usageEvents.durationMs),
      })
      .from(usageEvents)
      .leftJoin(mcpTools, eq(usageEvents.toolId, mcpTools.id))
      .where(
        and(
          eq(usageEvents.serverId, serverId),
          eq(usageEvents.userId, userId),
          gte(usageEvents.timestamp, startDate),
        ),
      )
      .groupBy(mcpTools.name)
      .orderBy(desc(count()))
      .limit(5);

    // Per-tool breakdown
    const toolBreakdownResult = await db
      .select({
        toolId: usageEvents.toolId,
        toolName: mcpTools.name,
        callCount: count(),
        avgDuration: avg(usageEvents.durationMs),
      })
      .from(usageEvents)
      .leftJoin(mcpTools, eq(usageEvents.toolId, mcpTools.id))
      .where(
        and(
          eq(usageEvents.serverId, serverId),
          eq(usageEvents.userId, userId),
          gte(usageEvents.timestamp, startDate),
        ),
      )
      .groupBy(usageEvents.toolId, mcpTools.name)
      .orderBy(desc(count()));

    const overview = overviewResult[0];
    const totalCalls = Number(overview?.totalCalls ?? 0);
    const successCount = Number(successResult[0]?.successCount ?? 0);
    const errorCount = Number(errorResult[0]?.errorCount ?? 0);
    const successRate = totalCalls > 0 ? (successCount / totalCalls) * 100 : 0;
    const avgLatency = Math.round(Number(overview?.avgDuration ?? 0));

    const percentiles = (percentileResult as unknown as readonly Record<string, unknown>[])[0];

    return NextResponse.json(
      createSuccessResponse({
        range,
        overview: {
          totalCalls,
          successCount,
          errorCount,
          successRate: Math.round(successRate * 100) / 100,
          avgLatencyMs: avgLatency,
          p50Ms: Number(percentiles?.['p50'] ?? 0),
          p95Ms: Number(percentiles?.['p95'] ?? 0),
          p99Ms: Number(percentiles?.['p99'] ?? 0),
        },
        topTools: topToolsResult.map((t) => ({
          name: t.toolName ?? 'unknown',
          calls: Number(t.callCount),
          avgMs: Math.round(Number(t.avgDuration ?? 0)),
        })),
        toolBreakdown: toolBreakdownResult.map((t) => ({
          toolId: t.toolId,
          name: t.toolName ?? 'unknown',
          calls: Number(t.callCount),
          avgMs: Math.round(Number(t.avgDuration ?? 0)),
        })),
      }),
    );
  });
}
