import { eq, and, desc, sql } from 'drizzle-orm';
import type { SpecVersion, CreateSpecVersionInput } from '@apifold/types';
import { specVersions } from '../schema/spec-versions';
import { specs } from '../schema/specs';
import { BaseRepository } from './base.repository';
import { DEFAULT_QUERY_LIMIT } from './constants';
import { diffTools } from '../../diff/spec-diff';

type NoOp = Record<string, never>;

export interface SpecVersionFilters {
  readonly specId: string;
}

export class SpecVersionRepository extends BaseRepository<
  SpecVersion,
  CreateSpecVersionInput,
  NoOp,
  SpecVersionFilters
> {
  async findAll(userId: string, filters?: SpecVersionFilters): Promise<readonly SpecVersion[]> {
    const specId = filters?.specId;
    if (!specId) {
      throw new Error('specId filter is required');
    }
    // Verify spec ownership
    const specRows = await this.db
      .select({ id: specs.id })
      .from(specs)
      .where(and(eq(specs.id, specId), eq(specs.userId, userId)))
      .limit(1);

    if (specRows.length === 0) {
      throw new Error('Spec not found or access denied');
    }

    const rows = await this.db
      .select()
      .from(specVersions)
      .where(eq(specVersions.specId, specId))
      .orderBy(desc(specVersions.versionNumber))
      .limit(DEFAULT_QUERY_LIMIT);

    return this.freezeAll(rows as SpecVersion[]);
  }

  async findById(userId: string, versionId: string): Promise<SpecVersion | null> {
    const rows = await this.db
      .select({
        version: specVersions,
        specUserId: specs.userId,
      })
      .from(specVersions)
      .innerJoin(specs, eq(specVersions.specId, specs.id))
      .where(and(eq(specVersions.id, versionId), eq(specs.userId, userId)))
      .limit(1);

    const row = rows[0];
    return row ? this.freeze(row.version as SpecVersion) : null;
  }

  async create(userId: string, input: CreateSpecVersionInput): Promise<SpecVersion> {
    return this.db.transaction(async (tx) => {
      // Verify spec ownership
      const specRows = await tx
        .select({ id: specs.id })
        .from(specs)
        .where(and(eq(specs.id, input.specId), eq(specs.userId, userId)))
        .limit(1);

      if (specRows.length === 0) {
        throw new Error('Spec not found or access denied');
      }

      // Get latest version number using advisory lock to prevent race conditions
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${input.specId}))`);

      const maxResult = await tx
        .select({ maxVersion: sql<number>`COALESCE(MAX(${specVersions.versionNumber}), 0)` })
        .from(specVersions)
        .where(eq(specVersions.specId, input.specId));

      const nextVersion = (maxResult[0]?.maxVersion ?? 0) + 1;

      // Compute diff against previous version
      let diffSummary: Record<string, unknown> | null = null;
      let isBreaking = false;

      if (nextVersion > 1) {
        const previousRows = await tx
          .select({ toolSnapshot: specVersions.toolSnapshot })
          .from(specVersions)
          .where(
            and(
              eq(specVersions.specId, input.specId),
              eq(specVersions.versionNumber, nextVersion - 1),
            ),
          )
          .limit(1);

        const previousTools = (previousRows[0]?.toolSnapshot ?? []) as unknown[];
        const diff = diffTools(previousTools, input.toolSnapshot);
        diffSummary = diff as unknown as Record<string, unknown>;
        isBreaking = diff.isBreaking;
      }

      const rows = await tx
        .insert(specVersions)
        .values({
          specId: input.specId,
          versionNumber: nextVersion,
          versionLabel: input.versionLabel ?? null,
          rawSpec: input.rawSpec,
          toolSnapshot: input.toolSnapshot,
          toolCount: input.toolSnapshot.length,
          diffSummary,
          isBreaking,
          sourceUrl: input.sourceUrl ?? null,
        })
        .returning();

      const version = rows[0]!;

      // Update spec's current_version_id
      await tx
        .update(specs)
        .set({ currentVersionId: version.id })
        .where(eq(specs.id, input.specId));

      return this.freeze(version as SpecVersion);
    });
  }

  async getLatestVersionNumber(userId: string, specId: string): Promise<number> {
    const result = await this.db
      .select({ maxVersion: sql<number>`COALESCE(MAX(${specVersions.versionNumber}), 0)` })
      .from(specVersions)
      .innerJoin(specs, eq(specVersions.specId, specs.id))
      .where(and(eq(specVersions.specId, specId), eq(specs.userId, userId)));

    return result[0]?.maxVersion ?? 0;
  }

  async update(_userId: string, _id: string, _input: unknown): Promise<SpecVersion> {
    throw new Error('Spec versions are immutable and cannot be updated');
  }

  async delete(_userId: string, _id: string): Promise<void> {
    throw new Error('Spec versions are immutable and cannot be deleted');
  }
}
