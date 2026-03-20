import { eq, and, ilike } from 'drizzle-orm';
import type { Spec, CreateSpecInput, UpdateSpecInput, SpecFilters } from '@apifold/types';
import { specs } from '../schema/specs';
import { BaseRepository } from './base.repository';
import { DEFAULT_QUERY_LIMIT, MAX_FILTER_LENGTH, escapeLikePattern } from './constants';

export class SpecRepository extends BaseRepository<
  Spec,
  CreateSpecInput,
  UpdateSpecInput,
  SpecFilters
> {
  async findAll(userId: string, filters?: SpecFilters): Promise<readonly Spec[]> {
    const conditions = [eq(specs.userId, userId)];

    if (filters?.name) {
      const escaped = escapeLikePattern(filters.name.slice(0, MAX_FILTER_LENGTH));
      conditions.push(ilike(specs.name, `%${escaped}%`));
    }
    if (filters?.version) {
      conditions.push(eq(specs.version, filters.version));
    }

    const rows = await this.db
      .select()
      .from(specs)
      .where(and(...conditions))
      .orderBy(specs.createdAt)
      .limit(DEFAULT_QUERY_LIMIT);

    return this.freezeAll(rows);
  }

  async findById(userId: string, id: string): Promise<Spec | null> {
    const rows = await this.db
      .select()
      .from(specs)
      .where(and(eq(specs.id, id), eq(specs.userId, userId)))
      .limit(1);

    const row = rows[0];
    return row ? this.freeze(row) : null;
  }

  async create(userId: string, input: CreateSpecInput, toolCount = 0): Promise<Spec> {
    const rows = await this.db
      .insert(specs)
      .values({
        userId,
        name: input.name,
        version: input.version,
        sourceUrl: input.sourceUrl ?? null,
        rawSpec: input.rawSpec,
        toolCount,
      })
      .returning();

    return this.freeze(rows[0]!);
  }

  async update(userId: string, id: string, input: UpdateSpecInput, toolCount?: number): Promise<Spec> {
    const updateValues: Record<string, unknown> = {};
    if (input.name !== undefined) updateValues['name'] = input.name;
    if (input.version !== undefined) updateValues['version'] = input.version;
    if (input.sourceUrl !== undefined) updateValues['sourceUrl'] = input.sourceUrl;
    if (input.rawSpec !== undefined) updateValues['rawSpec'] = input.rawSpec;
    if (toolCount !== undefined) updateValues['toolCount'] = toolCount;

    if (Object.keys(updateValues).length === 0) {
      throw new Error('No spec fields provided for update');
    }

    const rows = await this.db
      .update(specs)
      .set(updateValues)
      .where(and(eq(specs.id, id), eq(specs.userId, userId)))
      .returning();

    if (rows.length === 0) {
      throw new Error('Spec not found or access denied');
    }

    return this.freeze(rows[0]!);
  }

  async delete(userId: string, id: string): Promise<void> {
    const result = await this.db
      .delete(specs)
      .where(and(eq(specs.id, id), eq(specs.userId, userId)))
      .returning({ id: specs.id });

    if (result.length === 0) {
      throw new Error('Spec not found or access denied');
    }
  }
}
