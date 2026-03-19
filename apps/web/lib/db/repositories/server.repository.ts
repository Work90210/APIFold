import { eq, and } from 'drizzle-orm';
import type {
  McpServer,
  CreateServerInput,
  UpdateServerInput,
  ServerFilters,
} from '@apifold/types';
import { mcpServers } from '../schema/servers.js';
import { specs } from '../schema/specs.js';
import { BaseRepository } from './base.repository.js';
import { DEFAULT_QUERY_LIMIT } from './constants.js';

export class ServerRepository extends BaseRepository<
  McpServer,
  CreateServerInput,
  UpdateServerInput,
  ServerFilters
> {
  async findAll(userId: string, filters?: ServerFilters): Promise<readonly McpServer[]> {
    const conditions = [eq(mcpServers.userId, userId)];

    if (filters?.specId) {
      conditions.push(eq(mcpServers.specId, filters.specId));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(mcpServers.isActive, filters.isActive));
    }
    if (filters?.slug) {
      conditions.push(eq(mcpServers.slug, filters.slug));
    }

    const rows = await this.db
      .select()
      .from(mcpServers)
      .where(and(...conditions))
      .orderBy(mcpServers.createdAt)
      .limit(DEFAULT_QUERY_LIMIT);

    return this.freezeAll(rows);
  }

  async findById(userId: string, id: string): Promise<McpServer | null> {
    const rows = await this.db
      .select()
      .from(mcpServers)
      .where(and(eq(mcpServers.id, id), eq(mcpServers.userId, userId)))
      .limit(1);

    const row = rows[0];
    return row ? this.freeze(row) : null;
  }

  async findBySlug(userId: string, slug: string): Promise<McpServer | null> {
    const rows = await this.db
      .select()
      .from(mcpServers)
      .where(and(eq(mcpServers.slug, slug), eq(mcpServers.userId, userId)))
      .limit(1);

    const row = rows[0];
    return row ? this.freeze(row) : null;
  }

  async create(userId: string, input: CreateServerInput): Promise<McpServer> {
    return this.db.transaction(async (tx) => {
      // Verify the spec belongs to the calling user
      const specRows = await tx
        .select({ id: specs.id })
        .from(specs)
        .where(and(eq(specs.id, input.specId), eq(specs.userId, userId)))
        .limit(1);

      if (specRows.length === 0) {
        throw new Error('Spec not found or access denied');
      }

      const rows = await tx
        .insert(mcpServers)
        .values({
        userId,
        specId: input.specId,
        slug: input.slug,
        name: input.name,
        transport: input.transport ?? 'sse',
        authMode: input.authMode,
        baseUrl: input.baseUrl,
        rateLimitPerMinute: input.rateLimitPerMinute ?? 100,
      })
      .returning();

      return this.freeze(rows[0]!);
    });
  }

  async update(userId: string, id: string, input: UpdateServerInput): Promise<McpServer> {
    const updateValues: Record<string, unknown> = {};
    if (input.name !== undefined) updateValues['name'] = input.name;
    if (input.transport !== undefined) updateValues['transport'] = input.transport;
    if (input.authMode !== undefined) updateValues['authMode'] = input.authMode;
    if (input.baseUrl !== undefined) updateValues['baseUrl'] = input.baseUrl;
    if (input.rateLimitPerMinute !== undefined) updateValues['rateLimitPerMinute'] = input.rateLimitPerMinute;
    if (input.isActive !== undefined) updateValues['isActive'] = input.isActive;

    if (Object.keys(updateValues).length === 0) {
      throw new Error('No server fields provided for update');
    }

    const rows = await this.db
      .update(mcpServers)
      .set(updateValues)
      .where(and(eq(mcpServers.id, id), eq(mcpServers.userId, userId)))
      .returning();

    if (rows.length === 0) {
      throw new Error('Server not found or access denied');
    }

    return this.freeze(rows[0]!);
  }

  async delete(userId: string, id: string): Promise<void> {
    const result = await this.db
      .delete(mcpServers)
      .where(and(eq(mcpServers.id, id), eq(mcpServers.userId, userId)))
      .returning({ id: mcpServers.id });

    if (result.length === 0) {
      throw new Error('Server not found or access denied');
    }
  }
}
