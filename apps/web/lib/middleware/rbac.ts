import type { WorkspaceRole } from '@apifold/types';

import { getUserId, ApiError } from '../api-helpers';
import { getDb } from '../db/index';
import { WorkspaceRepository } from '../db/repositories/workspace.repository';

const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

function hasMinRole(userRole: WorkspaceRole, requiredRole: WorkspaceRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export interface RbacContext {
  readonly userId: string;
  readonly workspaceId: string;
  readonly role: WorkspaceRole;
}

export async function resolveWorkspaceContext(
  workspaceId: string,
  minRole: WorkspaceRole = 'viewer',
): Promise<RbacContext> {
  const userId = await getUserId();
  const db = getDb();
  const workspaceRepo = new WorkspaceRepository(db);

  const role = await workspaceRepo.getUserRole(workspaceId, userId);
  if (!role) {
    throw new ApiError('FORBIDDEN', 'Not a member of this workspace', 403);
  }

  if (!hasMinRole(role, minRole)) {
    throw new ApiError(
      'FORBIDDEN',
      `Insufficient permissions. Requires ${minRole} role, you have ${role}.`,
      403,
    );
  }

  return Object.freeze({ userId, workspaceId, role });
}

export function requireRole(minRole: WorkspaceRole) {
  return async (workspaceId: string): Promise<RbacContext> => {
    return resolveWorkspaceContext(workspaceId, minRole);
  };
}

export const canView = requireRole('viewer');
export const canEdit = requireRole('member');
export const canAdmin = requireRole('admin');
export const canOwn = requireRole('owner');

export { hasMinRole, ROLE_HIERARCHY };
