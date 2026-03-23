import { eq, and } from 'drizzle-orm';
import type {
  AccessProfile,
  CreateProfileInput,
  UpdateProfileInput,
  ProfileFilters,
} from '@apifold/types';
import { accessProfiles } from '../schema/profiles';
import { mcpServers } from '../schema/servers';
import { BaseRepository } from './base.repository';
import { DEFAULT_QUERY_LIMIT } from './constants';

export class ProfileRepository extends BaseRepository<
  AccessProfile,
  CreateProfileInput,
  UpdateProfileInput,
  ProfileFilters
> {
  async findAll(userId: string, filters?: ProfileFilters): Promise<readonly AccessProfile[]> {
    const conditions = [eq(accessProfiles.userId, userId)];

    if (filters?.serverId) {
      conditions.push(eq(accessProfiles.serverId, filters.serverId));
    }

    const rows = await this.db
      .select()
      .from(accessProfiles)
      .where(and(...conditions))
      .orderBy(accessProfiles.createdAt)
      .limit(DEFAULT_QUERY_LIMIT);

    return this.freezeAll(rows as AccessProfile[]);
  }

  async findById(userId: string, id: string): Promise<AccessProfile | null> {
    const rows = await this.db
      .select()
      .from(accessProfiles)
      .where(and(eq(accessProfiles.id, id), eq(accessProfiles.userId, userId)))
      .limit(1);

    const row = rows[0];
    return row ? this.freeze(row as AccessProfile) : null;
  }

  async findBySlug(userId: string, serverId: string, slug: string): Promise<AccessProfile | null> {
    const rows = await this.db
      .select()
      .from(accessProfiles)
      .where(
        and(
          eq(accessProfiles.serverId, serverId),
          eq(accessProfiles.slug, slug),
          eq(accessProfiles.userId, userId),
        ),
      )
      .limit(1);

    const row = rows[0];
    return row ? this.freeze(row as AccessProfile) : null;
  }

  async create(userId: string, input: CreateProfileInput): Promise<AccessProfile> {
    return this.db.transaction(async (tx) => {
      const serverRows = await tx
        .select({ id: mcpServers.id })
        .from(mcpServers)
        .where(and(eq(mcpServers.id, input.serverId), eq(mcpServers.userId, userId)))
        .limit(1);

      if (serverRows.length === 0) {
        throw new Error('Server not found or access denied');
      }

      const rows = await tx
        .insert(accessProfiles)
        .values({
          serverId: input.serverId,
          userId,
          name: input.name,
          slug: input.slug,
          description: input.description ?? null,
          toolIds: [...input.toolIds],
          isDefault: input.isDefault ?? false,
        })
        .returning();

      return this.freeze(rows[0]! as AccessProfile);
    });
  }

  async update(userId: string, id: string, input: UpdateProfileInput): Promise<AccessProfile> {
    const updateValues: Record<string, unknown> = {};

    if (input.name !== undefined) updateValues['name'] = input.name;
    if (input.description !== undefined) updateValues['description'] = input.description;
    if (input.toolIds !== undefined) updateValues['toolIds'] = [...input.toolIds];

    if (Object.keys(updateValues).length === 0) {
      throw new Error('No profile fields provided for update');
    }

    const rows = await this.db
      .update(accessProfiles)
      .set(updateValues)
      .where(and(eq(accessProfiles.id, id), eq(accessProfiles.userId, userId)))
      .returning();

    if (rows.length === 0) {
      throw new Error('Profile not found or access denied');
    }

    return this.freeze(rows[0]! as AccessProfile);
  }

  async delete(userId: string, id: string): Promise<void> {
    const result = await this.db
      .delete(accessProfiles)
      .where(
        and(
          eq(accessProfiles.id, id),
          eq(accessProfiles.userId, userId),
          eq(accessProfiles.isDefault, false), // Cannot delete default profiles
        ),
      )
      .returning({ id: accessProfiles.id });

    if (result.length === 0) {
      throw new Error('Profile not found, access denied, or is a default profile');
    }
  }
}
