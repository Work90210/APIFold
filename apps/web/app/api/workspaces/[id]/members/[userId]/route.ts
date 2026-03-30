import { createSuccessResponse } from '@apifold/types';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { withErrorHandler, withRateLimit, ApiError } from '../../../../../../lib/api-helpers';
import { getDb } from '../../../../../../lib/db/index';
import { WorkspaceRepository } from '../../../../../../lib/db/repositories/workspace.repository';
import { resolveWorkspaceContext } from '../../../../../../lib/middleware/rbac';
import { uuidParam } from '../../../../../../lib/validation/common.schema';

type RouteParams = { params: Promise<{ id: string; userId: string }> };

// Clerk user IDs are "user_<alphanumeric>" — also allow invite: prefix for pending members
const memberIdParam = z.string().min(1).max(128).regex(/^[a-zA-Z0-9_:@.+-]+$/);

export function DELETE(_request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const { id: workspaceId, userId: targetUserId } = await context.params;
    uuidParam.parse(workspaceId);
    memberIdParam.parse(targetUserId);

    const rbac = await resolveWorkspaceContext(workspaceId, 'admin');
    const rateLimited = await withRateLimit(rbac.userId);
    if (rateLimited) return rateLimited;

    // Cannot remove yourself — use a "leave workspace" flow instead
    if (targetUserId === rbac.userId) {
      throw new ApiError('FORBIDDEN', 'Use the leave workspace endpoint to remove yourself', 400);
    }

    // Cannot remove the workspace owner
    const db = getDb();
    const repo = new WorkspaceRepository(db);
    const targetRole = await repo.getUserRole(workspaceId, targetUserId);

    if (targetRole === 'owner') {
      throw new ApiError('FORBIDDEN', 'Cannot remove the workspace owner', 403);
    }

    await repo.removeMember(workspaceId, targetUserId);

    return NextResponse.json(createSuccessResponse(null));
  });
}
