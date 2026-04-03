import { NextResponse, type NextRequest } from 'next/server';
import { createSuccessResponse } from '@apifold/types';
import { getDb } from '../../../lib/db/index';
import { SpecRepository } from '../../../lib/db/repositories/spec.repository';
import { ServerRepository } from '../../../lib/db/repositories/server.repository';
import { ToolRepository } from '../../../lib/db/repositories/tool.repository';
import { ProfileRepository } from '../../../lib/db/repositories/profile.repository';
import { SpecVersionRepository } from '../../../lib/db/repositories/spec-version.repository';
import { getUserId, withErrorHandler, withRateLimit, ApiError } from '../../../lib/api-helpers';
import { autoGenerateProfiles } from '../../../lib/profiles/auto-generate';
import { createSpecSchema } from '../../../lib/validation/spec.schema';
import { randomBytes } from 'node:crypto';
import { fetchSpecFromUrl } from '../../../lib/ssrf-guard';
import { publishServerEvent } from '../../../lib/redis';
import { ErrorCodes } from '@apifold/types';
import { serverTrackSpecImported, serverTrackSpecValidationError } from '../../../lib/analytics/events.server';

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

    // Auto-convert Swagger 2.0 → OpenAPI 3.0 if needed, then parse + transform
    const { autoConvert, parseSpec, transformSpec } = await import('@apifold/transformer');
    let convertResult;
    let parseResult;
    let transformResult;
    try {
      convertResult = await autoConvert(rawSpec);
      parseResult = parseSpec({ spec: convertResult.spec as Record<string, unknown> });
      transformResult = transformSpec({ spec: parseResult.spec });
    } catch (err) {
      const errorType = err instanceof Error && err.message.includes('parse')
        ? 'parse_error'
        : 'unknown';
      Promise.resolve(serverTrackSpecValidationError({ userId, errorType })).catch(() => {});
      throw err;
    }

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
      const profileRepo = new ProfileRepository(tx);

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

      const createdTools = [];
      for (const tool of transformResult.tools) {
        const created = await toolRepo.create(userId, {
          serverId: server.id,
          name: tool.name,
          description: tool.description ?? null,
          inputSchema: (tool.inputSchema ?? {}) as Record<string, unknown>,
        });
        createdTools.push({ id: created.id, name: created.name, inputSchema: tool.inputSchema ?? {} });
      }

      // Auto-generate default access profiles (Read Only, Read/Write, Full Access)
      await autoGenerateProfiles(profileRepo, userId, server.id, createdTools);

      // Create initial spec version with tool snapshot
      const specVersionRepo = new SpecVersionRepository(tx);
      const toolSnapshot = transformResult.tools.map((tool) => ({
        name: tool.name,
        description: tool.description ?? null,
        inputSchema: tool.inputSchema ?? {},
      }));
      await specVersionRepo.create(userId, {
        specId: spec.id,
        rawSpec,
        toolSnapshot,
        versionLabel: input.version ?? '1.0.0',
        sourceUrl: input.sourceUrl ?? null,
      });

      return { spec, server };
    });

    // Track spec import analytics (best effort)
    Promise.resolve(serverTrackSpecImported({ userId, specId: result.spec.id, name: input.name, toolCount: transformResult.tools.length })).catch(() => {});

    // Notify runtime via Redis pub/sub (outside transaction — best effort)
    await publishServerEvent({
      type: 'server:created',
      serverId: result.server.id,
      slug: result.server.slug,
    });

    return NextResponse.json(
      createSuccessResponse({
        ...result,
        converted: convertResult.converted,
        originalVersion: convertResult.originalVersion,
      }),
      { status: 201 },
    );
  });
}
