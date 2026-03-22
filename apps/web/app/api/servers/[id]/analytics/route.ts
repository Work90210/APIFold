import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createSuccessResponse } from '@apifold/types';
import { getDb } from '../../../../../lib/db/index';
import { getUserId, withErrorHandler, withRateLimit, getUserPlan } from '../../../../../lib/api-helpers';
import { uuidParam } from '../../../../../lib/validation/common.schema';
import { usageEvents } from '../../../../../lib/db/schema/usage-events';
import { mcpTools } from '../../../../../lib/db/schema/tools';
import { requestLogs } from '../../../../../lib/db/schema/request-logs';
import { sql, eq, and, gte, count, avg, desc } from 'drizzle-orm';

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

function getBucketInterval(range: string): string {
  switch (range) {
    case '24h': return '1 hour';
    case '7d': return '1 day';
    case '30d': return '1 day';
    default: return '1 day';
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
    const bucketInterval = getBucketInterval(range);

    const db = getDb();

    // 1. Overview stats
    const overviewResult = await db
      .select({ totalCalls: count(), avgDuration: avg(usageEvents.durationMs) })
      .from(usageEvents)
      .where(and(eq(usageEvents.serverId, serverId), eq(usageEvents.userId, userId), gte(usageEvents.timestamp, startDate)));

    const successResult = await db
      .select({ successCount: count() })
      .from(usageEvents)
      .where(and(eq(usageEvents.serverId, serverId), eq(usageEvents.userId, userId), gte(usageEvents.timestamp, startDate), sql`${usageEvents.statusCode} < 400`));

    const errorResult = await db
      .select({ errorCount: count() })
      .from(usageEvents)
      .where(and(eq(usageEvents.serverId, serverId), eq(usageEvents.userId, userId), gte(usageEvents.timestamp, startDate), sql`${usageEvents.statusCode} >= 400`));

    // 2. Latency percentiles
    const percentileResult = await db.execute(sql`
      SELECT
        COALESCE(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY duration_ms), 0)::INTEGER AS p50,
        COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms), 0)::INTEGER AS p95,
        COALESCE(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms), 0)::INTEGER AS p99
      FROM usage_events
      WHERE server_id = ${serverId} AND user_id = ${userId} AND timestamp >= ${startDate.toISOString()}::TIMESTAMPTZ
    `);

    // 3. Time series — call volume + errors bucketed by hour/day
    const timeSeriesResult = await db.execute(sql`
      SELECT
        DATE_TRUNC(${sql.raw(`'${bucketInterval === '1 hour' ? 'hour' : 'day'}'`)}, timestamp) AS bucket,
        COUNT(*) AS calls,
        COUNT(*) FILTER (WHERE status_code >= 400) AS errors
      FROM usage_events
      WHERE server_id = ${serverId} AND user_id = ${userId} AND timestamp >= ${startDate.toISOString()}::TIMESTAMPTZ
      GROUP BY bucket
      ORDER BY bucket ASC
    `);

    // 4. Top tools
    const topToolsResult = await db
      .select({ toolName: mcpTools.name, callCount: count(), avgDuration: avg(usageEvents.durationMs) })
      .from(usageEvents)
      .leftJoin(mcpTools, eq(usageEvents.toolId, mcpTools.id))
      .where(and(eq(usageEvents.serverId, serverId), eq(usageEvents.userId, userId), gte(usageEvents.timestamp, startDate)))
      .groupBy(mcpTools.name)
      .orderBy(desc(count()))
      .limit(5);

    // 5. Error breakdown — by status code
    const errorBreakdownResult = await db.execute(sql`
      SELECT
        status_code,
        error_code,
        COUNT(*) AS count
      FROM usage_events
      WHERE server_id = ${serverId} AND user_id = ${userId}
        AND timestamp >= ${startDate.toISOString()}::TIMESTAMPTZ
        AND status_code >= 400
      GROUP BY status_code, error_code
      ORDER BY count DESC
      LIMIT 10
    `);

    // 6. Failing tools — tools with highest error rates
    const failingToolsResult = await db.execute(sql`
      SELECT
        t.name,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE ue.status_code >= 400) AS errors,
        ROUND(100.0 * COUNT(*) FILTER (WHERE ue.status_code >= 400) / NULLIF(COUNT(*), 0), 1) AS error_rate
      FROM usage_events ue
      LEFT JOIN mcp_tools t ON t.id = ue.tool_id
      WHERE ue.server_id = ${serverId} AND ue.user_id = ${userId}
        AND ue.timestamp >= ${startDate.toISOString()}::TIMESTAMPTZ
      GROUP BY t.name
      HAVING COUNT(*) FILTER (WHERE ue.status_code >= 400) > 0
      ORDER BY error_rate DESC
      LIMIT 5
    `);

    // 7. Recent activity — last 15 calls
    const recentResult = await db
      .select({
        toolName: mcpTools.name,
        statusCode: usageEvents.statusCode,
        durationMs: usageEvents.durationMs,
        timestamp: usageEvents.timestamp,
      })
      .from(usageEvents)
      .leftJoin(mcpTools, eq(usageEvents.toolId, mcpTools.id))
      .where(and(eq(usageEvents.serverId, serverId), eq(usageEvents.userId, userId)))
      .orderBy(desc(usageEvents.timestamp))
      .limit(15);

    // 8. Usage vs plan
    const plan = await getUserPlan(userId);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthlyUsageResult = await db
      .select({ monthCalls: count() })
      .from(usageEvents)
      .where(and(eq(usageEvents.userId, userId), gte(usageEvents.timestamp, monthStart)));

    // Assemble response
    const overview = overviewResult[0];
    const totalCalls = Number(overview?.totalCalls ?? 0);
    const successCount = Number(successResult[0]?.successCount ?? 0);
    const errorCount = Number(errorResult[0]?.errorCount ?? 0);
    const successRate = totalCalls > 0 ? (successCount / totalCalls) * 100 : 0;
    const percentiles = (percentileResult as unknown as readonly Record<string, unknown>[])[0];

    const timeSeries = (timeSeriesResult as unknown as readonly Record<string, unknown>[]).map((row) => ({
      bucket: String(row['bucket']),
      calls: Number(row['calls']),
      errors: Number(row['errors']),
    }));

    const errorBreakdown = (errorBreakdownResult as unknown as readonly Record<string, unknown>[]).map((row) => ({
      statusCode: Number(row['status_code']),
      errorCode: row['error_code'] ? String(row['error_code']) : null,
      count: Number(row['count']),
    }));

    const failingTools = (failingToolsResult as unknown as readonly Record<string, unknown>[]).map((row) => ({
      name: String(row['name'] ?? 'unknown'),
      total: Number(row['total']),
      errors: Number(row['errors']),
      errorRate: Number(row['error_rate']),
    }));

    const recentActivity = recentResult.map((row) => ({
      tool: row.toolName ?? 'unknown',
      status: row.statusCode,
      durationMs: row.durationMs,
      timestamp: row.timestamp,
    }));

    const monthlyUsage = Number(monthlyUsageResult[0]?.monthCalls ?? 0);

    return NextResponse.json(
      createSuccessResponse({
        range,
        overview: {
          totalCalls,
          successCount,
          errorCount,
          successRate: Math.round(successRate * 100) / 100,
          avgLatencyMs: Math.round(Number(overview?.avgDuration ?? 0)),
          p50Ms: Number(percentiles?.['p50'] ?? 0),
          p95Ms: Number(percentiles?.['p95'] ?? 0),
          p99Ms: Number(percentiles?.['p99'] ?? 0),
        },
        timeSeries,
        topTools: topToolsResult.map((t) => ({
          name: t.toolName ?? 'unknown',
          calls: Number(t.callCount),
          avgMs: Math.round(Number(t.avgDuration ?? 0)),
        })),
        errorBreakdown,
        failingTools,
        recentActivity,
        usage: {
          monthlyCallsUsed: monthlyUsage,
          monthlyCallsLimit: plan.maxRequestsPerMonth ?? null,
          planName: plan.name,
        },
      }),
    );
  });
}
