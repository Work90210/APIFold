import { NextResponse, type NextRequest } from 'next/server';
import { createSuccessResponse } from '@apifold/types';
import { getDb } from '../../../lib/db/index';
import { SpecRepository } from '../../../lib/db/repositories/spec.repository';
import { ServerRepository } from '../../../lib/db/repositories/server.repository';
import { ToolRepository } from '../../../lib/db/repositories/tool.repository';
import { getUserId, withErrorHandler, withRateLimit, ApiError } from '../../../lib/api-helpers';
import { createSpecSchema } from '../../../lib/validation/spec.schema';
import { randomBytes } from 'node:crypto';
import { fetchSpecFromUrl } from '../../../lib/ssrf-guard';
import { publishServerEvent } from '../../../lib/redis';
import { ErrorCodes } from '@apifold/types';

export function GET(_request: NextRequest): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const db = getDb();
    const specRepo = new SpecRepository(db);
    const specs = await specRepo.findAll(userId);

    return NextResponse.json(createSuccessResponse(specs));
  });
}

export function POST(request: NextRequest): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const input = createSpecSchema.parse(body);

    // Fetch or use raw spec
    let rawSpec: Record<string, unknown>;
    if (input.sourceUrl) {
      rawSpec = (await fetchSpecFromUrl(input.sourceUrl)) as Record<string, unknown>;
    } else if (input.rawSpec) {
      rawSpec = input.rawSpec;
    } else {
      throw new ApiError(ErrorCodes.VALIDATION_ERROR, 'Either sourceUrl or rawSpec is required', 400);
    }

    // Parse and transform spec to MCP tools
    const { parseSpec, transformSpec } = await import('@apifold/transformer');
    const parseResult = parseSpec({ spec: rawSpec });
    const transformResult = transformSpec({ spec: parseResult.spec });

    const db = getDb();

    // Generate unique slug from spec name + random suffix
    const baseSlug = input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 42) || 'api';
    const slug = `${baseSlug}-${randomBytes(3).toString('hex')}`;

    // Persist in a single transaction: spec → server → tools (all or nothing)
    const result = await db.transaction(async (tx) => {
      const specRepo = new SpecRepository(tx);
      const serverRepo = new ServerRepository(tx);
      const toolRepo = new ToolRepository(tx);

      const spec = await specRepo.create(userId, {
        name: input.name,
        version: input.version ?? '1.0.0',
        sourceUrl: input.sourceUrl ?? null,
        rawSpec,
      }, transformResult.tools.length);

      const server = await serverRepo.create(userId, {
        specId: spec.id,
        name: input.name,
        slug,
        authMode: 'none',
        baseUrl: '',
      });

      for (const tool of transformResult.tools) {
        await toolRepo.create(userId, {
          serverId: server.id,
          name: tool.name,
          description: tool.description ?? null,
          inputSchema: (tool.inputSchema ?? {}) as Record<string, unknown>,
        });
      }

      return { spec, server };
    });

    // Notify runtime via Redis pub/sub (outside transaction — best effort)
    await publishServerEvent({
      type: 'server:created',
      serverId: result.server.id,
      slug: result.server.slug,
    });

    return NextResponse.json(createSuccessResponse(result), { status: 201 });
  });
}
