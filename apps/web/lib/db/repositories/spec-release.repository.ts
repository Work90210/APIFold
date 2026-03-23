import { eq, and } from 'drizzle-orm';
import type { SpecRelease, CreateReleaseInput } from '@apifold/types';
import { specReleases } from '../schema/spec-releases';
import { specVersions } from '../schema/spec-versions';
import { mcpServers } from '../schema/servers';
import { specs } from '../schema/specs';
import { BaseRepository } from './base.repository';

type NoOp = Record<string, never>;

export interface SpecReleaseFilters {
  readonly serverId: string;
}

export class SpecReleaseRepository extends BaseRepository<
  SpecRelease,
  CreateReleaseInput,
  NoOp,
  SpecReleaseFilters
> {
  async findAll(userId: string, filters?: SpecReleaseFilters): Promise<readonly SpecRelease[]> {
    const serverId = filters?.serverId;
    if (!serverId) {
      throw new Error('serverId filter is required');
    }

    // Verify server ownership
    const serverRows = await this.db
      .select({ id: mcpServers.id })
      .from(mcpServers)
      .where(and(eq(mcpServers.id, serverId), eq(mcpServers.userId, userId)))
      .limit(1);

    if (serverRows.length === 0) {
      throw new Error('Server not found or access denied');
    }

    const rows = await this.db
      .select()
      .from(specReleases)
      .where(eq(specReleases.serverId, serverId));

    return this.freezeAll(rows as SpecRelease[]);
  }

  async findById(userId: string, releaseId: string): Promise<SpecRelease | null> {
    const rows = await this.db
      .select({
        release: specReleases,
        serverUserId: mcpServers.userId,
      })
      .from(specReleases)
      .innerJoin(mcpServers, eq(specReleases.serverId, mcpServers.id))
      .where(and(eq(specReleases.id, releaseId), eq(mcpServers.userId, userId)))
      .limit(1);

    const row = rows[0];
    return row ? this.freeze(row.release as SpecRelease) : null;
  }

  async create(userId: string, input: CreateReleaseInput): Promise<SpecRelease> {
    return this.db.transaction(async (tx) => {
      // Verify server ownership
      const serverRows = await tx
        .select({ id: mcpServers.id, specId: mcpServers.specId })
        .from(mcpServers)
        .where(and(eq(mcpServers.id, input.serverId), eq(mcpServers.userId, userId)))
        .limit(1);

      if (serverRows.length === 0) {
        throw new Error('Server not found or access denied');
      }

      // Verify the version belongs to the server's spec
      const versionRows = await tx
        .select({ id: specVersions.id, specId: specVersions.specId })
        .from(specVersions)
        .innerJoin(specs, eq(specVersions.specId, specs.id))
        .where(
          and(
            eq(specVersions.id, input.versionId),
            eq(specs.userId, userId),
          ),
        )
        .limit(1);

      if (versionRows.length === 0) {
        throw new Error('Version not found or access denied');
      }

      // Verify version belongs to the same spec as the server
      if (versionRows[0]!.specId !== serverRows[0]!.specId) {
        throw new Error('Version does not belong to this server\'s spec');
      }

      const environment = input.environment ?? 'production';

      // Upsert: replace existing release for the same server + environment
      const rows = await tx
        .insert(specReleases)
        .values({
          serverId: input.serverId,
          environment,
          versionId: input.versionId,
          endpointUrl: input.endpointUrl ?? null,
          promotedBy: userId,
        })
        .onConflictDoUpdate({
          target: [specReleases.serverId, specReleases.environment],
          set: {
            versionId: input.versionId,
            endpointUrl: input.endpointUrl ?? null,
            promotedBy: userId,
            promotedAt: new Date(),
          },
        })
        .returning();

      return this.freeze(rows[0]! as SpecRelease);
    });
  }

  async update(): Promise<SpecRelease> {
    throw new Error('Use create/promote to update releases');
  }

  async delete(): Promise<void> {
    throw new Error('Releases cannot be deleted directly');
  }
}
