import { NextResponse, type NextRequest } from 'next/server';
import { createSuccessResponse, ErrorCodes } from '@apifold/types';
import { getDb } from '../../../../../lib/db/index';
import { ServerRepository } from '../../../../../lib/db/repositories/server.repository';
import { ToolRepository } from '../../../../../lib/db/repositories/tool.repository';
import { CredentialRepository } from '../../../../../lib/db/repositories/credential.repository';
import { getUserId, withErrorHandler, withRateLimit, errorResponse, ApiError } from '../../../../../lib/api-helpers';
import { uuidParam } from '../../../../../lib/validation/common.schema';
import { safeFetch } from '../../../../../lib/ssrf-guard';
import { z } from 'zod';

const testCallSchema = z.object({
  toolName: z.string().min(1).max(200),
  arguments: z.record(z.string(), z.unknown()).default({}),
});

type RouteParams = { params: Promise<{ id: string }> };

export function POST(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const { id: serverId } = await context.params;
    uuidParam.parse(serverId);

    const body = await request.json();
    const input = testCallSchema.parse(body);

    const db = getDb();
    const serverRepo = new ServerRepository(db);
    const server = await serverRepo.findById(userId, serverId);

    if (!server) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Server not found', 404);
    }

    if (!server.baseUrl) {
      throw new ApiError(ErrorCodes.VALIDATION_ERROR, 'Server has no base URL configured', 400);
    }

    // Validate tool exists in DB (prevents path traversal via crafted toolName)
    const toolRepo = new ToolRepository(db);
    const tools = await toolRepo.findAll(userId, { serverId });
    const matchedTool = tools.find((t) => t.name === input.toolName);
    if (!matchedTool) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Tool not found', 404);
    }

    // Build upstream URL using the DB-stored tool name (safe)
    const base = server.baseUrl.endsWith('/') ? server.baseUrl.slice(0, -1) : server.baseUrl;
    const url = `${base}/tools/${encodeURIComponent(matchedTool.name)}`;

    // Build auth headers
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (server.authMode !== 'none') {
      const credentialRepo = new CredentialRepository(db);
      const credentials = await credentialRepo.findAll(userId, { serverId });
      if (credentials.length > 0) {
        const key = await credentialRepo.getDecryptedKey(userId, credentials[0]!.id);
        if (server.authMode === 'bearer') {
          headers['Authorization'] = `Bearer ${key}`;
        } else {
          headers['X-API-Key'] = key;
        }
      }
    }

    // Execute the call with SSRF protection
    const response = await safeFetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(input.arguments),
      signal: AbortSignal.timeout(30_000),
    });

    const responseText = await response.text();
    const MAX_RESPONSE_SIZE = 1024 * 1024; // 1MB
    const isTruncated = responseText.length > MAX_RESPONSE_SIZE;
    const responseBody = isTruncated ? responseText.slice(0, MAX_RESPONSE_SIZE) : responseText;

    return NextResponse.json(createSuccessResponse({
      status: response.status,
      body: responseBody,
      truncated: isTruncated,
    }));
  });
}
