import { eq, and, ilike } from 'drizzle-orm';
import type { McpTool, CreateToolInput, UpdateToolInput, ToolFilters } from '@apifold/types';
import { mcpTools } from '../schema/tools.js';
import { mcpServers } from '../schema/servers.js';
import { BaseRepository } from './base.repository.js';
import { DEFAULT_QUERY_LIMIT, MAX_FILTER_LENGTH, escapeLikePattern } from './constants.js';

export class ToolRepository extends BaseRepository<
  McpTool,
  CreateToolInput,
  UpdateToolInput,
  ToolFilters
> {
  async findAll(userId: string, filters?: ToolFilters): Promise<readonly McpTool[]> {
    const conditions = [eq(mcpServers.userId, userId)];

    if (filters?.serverId) {
      conditions.push(eq(mcpTools.serverId, filters.serverId));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(mcpTools.isActive, filters.isActive));
    }
    if (filters?.name) {
      const escaped = escapeLikePattern(filters.name.slice(0, MAX_FILTER_LENGTH));
      conditions.push(ilike(mcpTools.name, `%${escaped}%`));
    }

    const rows = await this.db
      .select({
        id: mcpTools.id,
        serverId: mcpTools.serverId,
        name: mcpTools.name,
        description: mcpTools.description,
        inputSchema: mcpTools.inputSchema,
        isActive: mcpTools.isActive,
        createdAt: mcpTools.createdAt,
        updatedAt: mcpTools.updatedAt,
      })
      .from(mcpTools)
      .innerJoin(mcpServers, eq(mcpTools.serverId, mcpServers.id))
      .where(and(...conditions))
      .orderBy(mcpTools.createdAt)
      .limit(DEFAULT_QUERY_LIMIT);

    return this.freezeAll(rows);
  }

  async findById(userId: string, id: string): Promise<McpTool | null> {
    const rows = await this.db
      .select({
        id: mcpTools.id,
        serverId: mcpTools.serverId,
        name: mcpTools.name,
        description: mcpTools.description,
        inputSchema: mcpTools.inputSchema,
        isActive: mcpTools.isActive,
        createdAt: mcpTools.createdAt,
        updatedAt: mcpTools.updatedAt,
      })
      .from(mcpTools)
      .innerJoin(mcpServers, eq(mcpTools.serverId, mcpServers.id))
      .where(and(eq(mcpTools.id, id), eq(mcpServers.userId, userId)))
      .limit(1);

    const row = rows[0];
    return row ? this.freeze(row) : null;
  }

  async create(userId: string, input: CreateToolInput): Promise<McpTool> {
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
        .insert(mcpTools)
        .values({
          serverId: input.serverId,
          name: input.name,
          description: input.description ?? null,
          inputSchema: input.inputSchema,
        })
        .returning();

      return this.freeze(rows[0]!);
    });
  }

  async update(userId: string, id: string, input: UpdateToolInput): Promise<McpTool> {
    return this.db.transaction(async (tx) => {
      // Verify ownership and get serverId for the DML WHERE clause
      const existing = await tx
        .select({ id: mcpTools.id, serverId: mcpTools.serverId })
        .from(mcpTools)
        .innerJoin(mcpServers, eq(mcpTools.serverId, mcpServers.id))
        .where(and(eq(mcpTools.id, id), eq(mcpServers.userId, userId)))
        .limit(1);

      if (existing.length === 0) {
        throw new Error('Tool not found or access denied');
      }

      const updateValues: Record<string, unknown> = {};
      if (input.name !== undefined) updateValues['name'] = input.name;
      if (input.description !== undefined) updateValues['description'] = input.description;
      if (input.inputSchema !== undefined) updateValues['inputSchema'] = input.inputSchema;
      if (input.isActive !== undefined) updateValues['isActive'] = input.isActive;

      if (Object.keys(updateValues).length === 0) {
        throw new Error('No tool fields provided for update');
      }

      // Re-verify ownership in DML WHERE to prevent TOCTOU
      const rows = await tx
        .update(mcpTools)
        .set(updateValues)
        .where(and(
          eq(mcpTools.id, id),
          eq(mcpTools.serverId, existing[0]!.serverId),
        ))
        .returning();

      if (rows.length === 0) {
        throw new Error('Tool not found or access denied');
      }

      return this.freeze(rows[0]!);
    });
  }

  async delete(userId: string, id: string): Promise<void> {
    return this.db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: mcpTools.id, serverId: mcpTools.serverId })
        .from(mcpTools)
        .innerJoin(mcpServers, eq(mcpTools.serverId, mcpServers.id))
        .where(and(eq(mcpTools.id, id), eq(mcpServers.userId, userId)))
        .limit(1);

      if (existing.length === 0) {
        throw new Error('Tool not found or access denied');
      }

      // Re-verify ownership in DML WHERE to prevent TOCTOU
      const deleted = await tx.delete(mcpTools).where(and(
        eq(mcpTools.id, id),
        eq(mcpTools.serverId, existing[0]!.serverId),
      )).returning({ id: mcpTools.id });

      if (deleted.length === 0) {
        throw new Error('Tool not found or access denied');
      }
    });
  }
}
