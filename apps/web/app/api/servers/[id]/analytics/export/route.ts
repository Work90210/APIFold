import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getDb } from '../../../../../../lib/db/index';
import { getUserId, withErrorHandler, withRateLimit } from '../../../../../../lib/api-helpers';
import { uuidParam } from '../../../../../../lib/validation/common.schema';
import { sql } from 'drizzle-orm';

type RouteParams = { params: Promise<{ id: string }> };

const exportSchema = z.object({
  range: z.enum(['24h', '7d', '30d']).default('7d'),
  type: z.enum(['usage', 'errors']).default('usage'),
});

function csvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

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
    const { range, type } = exportSchema.parse({
      range: url.searchParams.get('range') ?? '7d',
      type: url.searchParams.get('type') ?? 'usage',
    });

    const startDate = getStartDate(range);
    const db = getDb();

    let csvContent: string;

    if (type === 'usage') {
      const rows = await db.execute(sql`
        SELECT
          t.name AS tool_name,
          ue.status_code,
          ue.duration_ms,
          ue.error_code,
          ue.timestamp
        FROM usage_events ue
        LEFT JOIN mcp_tools t ON t.id = ue.tool_id
        WHERE ue.server_id = ${serverId}
          AND ue.user_id = ${userId}
          AND ue.timestamp >= ${startDate.toISOString()}::TIMESTAMPTZ
        ORDER BY ue.timestamp DESC
        LIMIT 10000
      `);

      const data = rows as unknown as readonly Record<string, unknown>[];
      csvContent = 'tool,status_code,duration_ms,error_code,timestamp\n';
      csvContent += data
        .map((r) =>
          `${csvField(String(r['tool_name'] ?? ''))},${r['status_code']},${r['duration_ms']},${csvField(String(r['error_code'] ?? ''))},${String(r['timestamp'])}`,
        )
        .join('\n');
    } else {
      const rows = await db.execute(sql`
        SELECT
          t.name AS tool_name,
          ue.status_code,
          ue.error_code,
          ue.duration_ms,
          ue.timestamp
        FROM usage_events ue
        LEFT JOIN mcp_tools t ON t.id = ue.tool_id
        WHERE ue.server_id = ${serverId}
          AND ue.user_id = ${userId}
          AND ue.timestamp >= ${startDate.toISOString()}::TIMESTAMPTZ
          AND ue.status_code >= 400
        ORDER BY ue.timestamp DESC
        LIMIT 10000
      `);

      const data = rows as unknown as readonly Record<string, unknown>[];
      csvContent = 'tool,status_code,error_code,duration_ms,timestamp\n';
      csvContent += data
        .map((r) =>
          `${csvField(String(r['tool_name'] ?? ''))},${r['status_code']},${csvField(String(r['error_code'] ?? ''))},${r['duration_ms']},${String(r['timestamp'])}`,
        )
        .join('\n');
    }

    const filename = `analytics-${type}-${range}-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  });
}
