import { createSuccessResponse } from '@apifold/types';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { withErrorHandler, withRateLimit, NotFoundError } from '../../../../lib/api-helpers';
import { getDb } from '../../../../lib/db/index';
import { WorkspaceRepository } from '../../../../lib/db/repositories/workspace.repository';
import { resolveWorkspaceContext } from '../../../../lib/middleware/rbac';
import { uuidParam } from '../../../../lib/validation/common.schema';

type RouteParams = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  // plan changes must go through the billing/checkout route — not directly settable
});

export function GET(_request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const { id } = await context.params;
    uuidParam.parse(id);

    const rbac = await resolveWorkspaceContext(id, 'viewer');
    await withRateLimit(rbac.userId);

    const db = getDb();
    const repo = new WorkspaceRepository(db);
    const workspace = await repo.findByIdWithMembers(id);

    if (!workspace) throw new NotFoundError('Workspace not found');

    // Strip pending invites — callers should not see invite:<email> tokens
    const sanitized = {
      ...workspace,
      members: workspace.members.filter((m) => m.acceptedAt !== null),
    };

    return NextResponse.json(createSuccessResponse(sanitized));
  });
}

export function PUT(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const { id } = await context.params;
    uuidParam.parse(id);

    const rbac = await resolveWorkspaceContext(id, 'admin');
    const rateLimited = await withRateLimit(rbac.userId);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const input = updateSchema.parse(body);

    const db = getDb();
    const repo = new WorkspaceRepository(db);
    const updated = await repo.update(id, input);

    return NextResponse.json(createSuccessResponse(updated));
  });
}
