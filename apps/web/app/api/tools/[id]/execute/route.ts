import { createSuccessResponse } from '@apifold/types';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { getUserId, withErrorHandler, withRateLimit, NotFoundError } from '../../../../../lib/api-helpers';
import { getDb } from '../../../../../lib/db/index';
import { mcpTools, mcpServers } from '../../../../../lib/db/schema/index';
import { eq } from 'drizzle-orm';
import { uuidParam } from '../../../../../lib/validation/common.schema';
import { resolveWorkspaceContext } from '../../../../../lib/middleware/rbac';

type RouteParams = { params: Promise<{ id: string }> };

const executeSchema = z.object({
  arguments: z.record(z.string(), z.unknown()).default({}),
});

const RUNTIME_URL = process.env.RUNTIME_INTERNAL_URL ?? 'http://localhost:3001';

export function POST(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { id: toolId } = await context.params;
    uuidParam.parse(toolId);

    const body = await request.json();
    const input = executeSchema.parse(body);

    const db = getDb();

    // Resolve tool → server (no tokenHash — never select secrets unnecessarily)
    const toolRows = await db
      .select({
        toolId: mcpTools.id,
        toolName: mcpTools.name,
        serverId: mcpServers.id,
        serverSlug: mcpServers.slug,
        serverUserId: mcpServers.userId,
        workspaceId: mcpServers.workspaceId,
      })
      .from(mcpTools)
      .innerJoin(mcpServers, eq(mcpTools.serverId, mcpServers.id))
      .where(eq(mcpTools.id, toolId))
      .limit(1);

    const tool = toolRows[0];
    if (!tool) throw new NotFoundError('Tool not found');

    // Authorize: caller must own the server directly, or be a member of its workspace
    const ownedByUser = tool.serverUserId === userId;
    let workspaceAuthorized = false;

    if (!ownedByUser && tool.workspaceId) {
      try {
        await resolveWorkspaceContext(tool.workspaceId, 'member');
        workspaceAuthorized = true;
      } catch {
        // Not a workspace member — fall through to rejection
      }
    }

    if (!ownedByUser && !workspaceAuthorized) {
      throw new NotFoundError('Tool not found');
    }

    // Proxy execution through the runtime via internal MCP call
    const runtimeUrl = `${RUNTIME_URL}/mcp/${tool.serverSlug}`;
    const runtimeSecret = process.env.MCP_RUNTIME_SECRET;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (runtimeSecret) {
      headers['Authorization'] = `Bearer ${runtimeSecret}`;
    }

    // Initialize session
    const initRes = await fetch(runtimeUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }),
    });

    if (!initRes.ok) {
      return NextResponse.json(
        createSuccessResponse({ error: 'Runtime unavailable', status: initRes.status }),
        { status: 502 },
      );
    }

    const sessionId = initRes.headers.get('mcp-session-id');
    if (sessionId) {
      headers['Mcp-Session-Id'] = sessionId;
    }

    // Execute tool
    const callRes = await fetch(runtimeUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: tool.toolName, arguments: input.arguments },
      }),
    });

    const result = await callRes.json();

    return NextResponse.json(createSuccessResponse(result));
  });
}
