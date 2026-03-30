import { createSuccessResponse } from '@apifold/types';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { withErrorHandler, withRateLimit } from '../../../../../lib/api-helpers';
import { getDb } from '../../../../../lib/db/index';
import { WorkspaceRepository } from '../../../../../lib/db/repositories/workspace.repository';
import { resolveWorkspaceContext } from '../../../../../lib/middleware/rbac';
import { uuidParam } from '../../../../../lib/validation/common.schema';

type RouteParams = { params: Promise<{ id: string }> };

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']),
});

export function POST(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const { id: workspaceId } = await context.params;
    uuidParam.parse(workspaceId);

    const rbac = await resolveWorkspaceContext(workspaceId, 'admin');
    const rateLimited = await withRateLimit(rbac.userId);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const input = addMemberSchema.parse(body);

    // In a full implementation, this would:
    // 1. Look up the user by email via Clerk
    // 2. If found, add directly as member
    // 3. If not found, create an invitation record and send email
    // For now, store the email as a placeholder userId for invitation tracking
    const db = getDb();
    const repo = new WorkspaceRepository(db);
    const member = await repo.addMember(workspaceId, `invite:${input.email}`, input.role);

    return NextResponse.json(createSuccessResponse(member), { status: 201 });
  });
}
