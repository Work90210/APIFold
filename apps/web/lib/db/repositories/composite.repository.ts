import { randomBytes, scryptSync } from 'node:crypto';

import type {
  CompositeServer,
  CompositeServerWithMembers,
  CompositeMember,
  CreateCompositeInput,
  UpdateCompositeInput,
} from '@apifold/types';
import { eq, and, inArray } from 'drizzle-orm';

import { compositeServers, compositeMembers } from '../schema/composite-servers';
import { mcpServers } from '../schema/servers';

import { BaseRepository } from './base.repository';
import { DEFAULT_QUERY_LIMIT } from './constants';

const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;

function generateEndpointId(): string {
  return randomBytes(6).toString('hex');
}

function generateCompositeToken(): { token: string; tokenHash: string } {
  const token = `af_${randomBytes(32).toString('hex')}`;
  const salt = randomBytes(16);
  const hash = scryptSync(token, salt, SCRYPT_KEY_LENGTH, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
  });
  const tokenHash = `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
  return { token, tokenHash };
}

export class CompositeRepository extends BaseRepository<
  CompositeServer,
  CreateCompositeInput,
  UpdateCompositeInput
> {
  async findAll(userId: string): Promise<readonly CompositeServer[]> {
    const rows = await this.db
      .select()
      .from(compositeServers)
      .where(eq(compositeServers.userId, userId))
      .orderBy(compositeServers.createdAt)
      .limit(DEFAULT_QUERY_LIMIT);

    return this.freezeAll(rows);
  }

  async findById(userId: string, id: string): Promise<CompositeServer | null> {
    const rows = await this.db
      .select()
      .from(compositeServers)
      .where(and(eq(compositeServers.id, id), eq(compositeServers.userId, userId)))
      .limit(1);

    const row = rows[0];
    return row ? this.freeze(row) : null;
  }

  async findByIdWithMembers(userId: string, id: string): Promise<CompositeServerWithMembers | null> {
    const composite = await this.findById(userId, id);
    if (!composite) return null;

    const memberRows = await this.db
      .select({
        id: compositeMembers.id,
        compositeId: compositeMembers.compositeId,
        serverId: compositeMembers.serverId,
        namespace: compositeMembers.namespace,
        displayOrder: compositeMembers.displayOrder,
        createdAt: compositeMembers.createdAt,
        serverName: mcpServers.name,
        serverSlug: mcpServers.slug,
      })
      .from(compositeMembers)
      .leftJoin(mcpServers, eq(compositeMembers.serverId, mcpServers.id))
      .where(eq(compositeMembers.compositeId, id))
      .orderBy(compositeMembers.displayOrder);

    return this.freeze({
      ...composite,
      members: Object.freeze(memberRows.map((r) => Object.freeze(r))),
    }) as CompositeServerWithMembers;
  }

  async create(
    userId: string,
    input: CreateCompositeInput,
  ): Promise<CompositeServer & { readonly token: string }> {
    const { token, tokenHash } = generateCompositeToken();
    const endpointId = generateEndpointId();

    return this.db.transaction(async (tx) => {
      // Verify all member servers belong to the requesting user
      if (input.members.length > 0) {
        const memberServerIds = input.members.map((m) => m.serverId);
        const ownedServers = await tx
          .select({ id: mcpServers.id })
          .from(mcpServers)
          .where(and(
            inArray(mcpServers.id, memberServerIds),
            eq(mcpServers.userId, userId),
          ));
        if (ownedServers.length !== memberServerIds.length) {
          throw new Error('One or more member servers not found or not owned by user');
        }
      }

      const [composite] = await tx
        .insert(compositeServers)
        .values({
          userId,
          slug: input.slug,
          endpointId,
          name: input.name,
          description: input.description ?? null,
          transport: input.transport ?? 'sse',
          tokenHash,
        })
        .returning();

      if (!composite) throw new Error('Failed to create composite server');

      if (input.members.length > 0) {
        await tx.insert(compositeMembers).values(
          input.members.map((m, i) => ({
            compositeId: composite.id,
            serverId: m.serverId,
            namespace: m.namespace,
            displayOrder: m.displayOrder ?? i,
          })),
        );
      }

      return this.freeze({ ...composite, token });
    });
  }

  async update(
    userId: string,
    id: string,
    input: UpdateCompositeInput,
  ): Promise<CompositeServer> {
    return this.db.transaction(async (tx) => {
      const updateFields: Record<string, unknown> = { updatedAt: new Date() };
      if (input.name !== undefined) updateFields.name = input.name;
      if (input.description !== undefined) updateFields.description = input.description;
      if (input.transport !== undefined) updateFields.transport = input.transport;
      if (input.isActive !== undefined) updateFields.isActive = input.isActive;

      const [updated] = await tx
        .update(compositeServers)
        .set(updateFields)
        .where(and(eq(compositeServers.id, id), eq(compositeServers.userId, userId)))
        .returning();

      if (!updated) throw new Error('Composite server not found');

      // Replace members if provided
      if (input.members !== undefined) {
        // Verify all member servers belong to the requesting user
        if (input.members.length > 0) {
          const memberServerIds = input.members.map((m) => m.serverId);
          const ownedServers = await tx
            .select({ id: mcpServers.id })
            .from(mcpServers)
            .where(and(
              inArray(mcpServers.id, memberServerIds),
              eq(mcpServers.userId, userId),
            ));
          if (ownedServers.length !== memberServerIds.length) {
            throw new Error('One or more member servers not found or not owned by user');
          }
        }

        await tx
          .delete(compositeMembers)
          .where(eq(compositeMembers.compositeId, id));

        if (input.members.length > 0) {
          await tx.insert(compositeMembers).values(
            input.members.map((m, i) => ({
              compositeId: id,
              serverId: m.serverId,
              namespace: m.namespace,
              displayOrder: m.displayOrder ?? i,
            })),
          );
        }
      }

      return this.freeze(updated);
    });
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.db
      .delete(compositeServers)
      .where(and(eq(compositeServers.id, id), eq(compositeServers.userId, userId)));
  }
}
