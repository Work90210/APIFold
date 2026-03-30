export type WorkspacePlan = 'free' | 'pro' | 'enterprise';

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Workspace {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly plan: WorkspacePlan;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface WorkspaceMember {
  readonly workspaceId: string;
  readonly userId: string;
  readonly role: WorkspaceRole;
  readonly invitedAt: Date;
  readonly acceptedAt: Date | null;
}

export interface WorkspaceWithMembers extends Workspace {
  readonly members: readonly WorkspaceMember[];
}

export interface CreateWorkspaceInput {
  readonly name: string;
  readonly slug: string;
}

export interface UpdateWorkspaceInput {
  readonly name?: string;
  readonly plan?: WorkspacePlan;
}

export interface InviteMemberInput {
  readonly email: string;
  readonly role: WorkspaceRole;
}
