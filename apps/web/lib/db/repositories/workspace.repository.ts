import type {
  Workspace,
  WorkspaceMember,
  WorkspaceWithMembers,
  WorkspaceRole,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from '@apifold/types';
import { eq, and, isNotNull } from 'drizzle-orm';

import { workspaces, workspaceMembers } from '../schema/workspaces';
import type { DrizzleClient } from '../index';

export class WorkspaceRepository {
  constructor(private readonly db: DrizzleClient) {}

  async findAllForUser(userId: string): Promise<readonly Workspace[]> {
    const rows = await this.db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        plan: workspaces.plan,
        createdAt: workspaces.createdAt,
        updatedAt: workspaces.updatedAt,
      })
      .from(workspaces)
      .innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, userId))
      .orderBy(workspaces.createdAt);

    return Object.freeze(rows.map((r) => Object.freeze(r)));
  }

  async findById(id: string): Promise<Workspace | null> {
    const rows = await this.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, id))
      .limit(1);

    return rows[0] ? Object.freeze(rows[0]) : null;
  }

  async findByIdWithMembers(id: string): Promise<WorkspaceWithMembers | null> {
    const workspace = await this.findById(id);
    if (!workspace) return null;

    const members = await this.db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, id))
      .orderBy(workspaceMembers.invitedAt);

    return Object.freeze({
      ...workspace,
      members: Object.freeze(members.map((m) => Object.freeze(m))),
    });
  }

  async getUserRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null> {
    const rows = await this.db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
        isNotNull(workspaceMembers.acceptedAt),
      ))
      .limit(1);

    const row = rows[0];
    return row ? (row.role as WorkspaceRole) : null;
  }

  async create(userId: string, input: CreateWorkspaceInput): Promise<Workspace> {
    return this.db.transaction(async (tx) => {
      const [workspace] = await tx
        .insert(workspaces)
        .values({
          name: input.name,
          slug: input.slug,
        })
        .returning();

      if (!workspace) throw new Error('Failed to create workspace');

      await tx.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId,
        role: 'owner',
        acceptedAt: new Date(),
      });

      return Object.freeze(workspace);
    });
  }

  async update(id: string, input: UpdateWorkspaceInput): Promise<Workspace> {
    const updateFields: Record<string, unknown> = { updatedAt: new Date() };
    if (input.name !== undefined) updateFields.name = input.name;
    if (input.plan !== undefined) updateFields.plan = input.plan;

    const [updated] = await this.db
      .update(workspaces)
      .set(updateFields)
      .where(eq(workspaces.id, id))
      .returning();

    if (!updated) throw new Error('Workspace not found');
    return Object.freeze(updated);
  }

  async addMember(workspaceId: string, userId: string, role: WorkspaceRole, accepted = false): Promise<WorkspaceMember> {
    const [member] = await this.db
      .insert(workspaceMembers)
      .values({
        workspaceId,
        userId,
        role,
        acceptedAt: accepted ? new Date() : null,
      })
      .returning();

    if (!member) throw new Error('Failed to add member');
    return Object.freeze(member);
  }

  async updateMemberRole(workspaceId: string, userId: string, role: WorkspaceRole): Promise<void> {
    await this.db
      .update(workspaceMembers)
      .set({ role })
      .where(and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
      ));
  }

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    await this.db
      .delete(workspaceMembers)
      .where(and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
      ));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(workspaces).where(eq(workspaces.id, id));
  }
}
