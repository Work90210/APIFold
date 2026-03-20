import { eq, and } from 'drizzle-orm';
import type {
  SafeCredential,
  CreateCredentialInput,
  UpdateCredentialInput,
  CredentialFilters,
} from '@apifold/types';
import { credentials } from '../schema/credentials';
import { mcpServers } from '../schema/servers';
import { encryptCredential, decryptCredential } from '../../vault/index';
import { BaseRepository } from './base.repository';
import { DEFAULT_QUERY_LIMIT } from './constants';

const safeColumns = {
  id: credentials.id,
  serverId: credentials.serverId,
  userId: credentials.userId,
  label: credentials.label,
  authType: credentials.authType,
  expiresAt: credentials.expiresAt,
  createdAt: credentials.createdAt,
  updatedAt: credentials.updatedAt,
} as const;

export class CredentialRepository extends BaseRepository<
  SafeCredential,
  CreateCredentialInput,
  UpdateCredentialInput,
  CredentialFilters
> {
  async findAll(userId: string, filters?: CredentialFilters): Promise<readonly SafeCredential[]> {
    const conditions = [eq(credentials.userId, userId)];

    if (filters?.serverId) {
      conditions.push(eq(credentials.serverId, filters.serverId));
    }
    if (filters?.authType) {
      conditions.push(eq(credentials.authType, filters.authType));
    }

    const rows = await this.db
      .select(safeColumns)
      .from(credentials)
      .where(and(...conditions))
      .orderBy(credentials.createdAt)
      .limit(DEFAULT_QUERY_LIMIT);

    return this.freezeAll(rows);
  }

  async findById(userId: string, id: string): Promise<SafeCredential | null> {
    const rows = await this.db
      .select(safeColumns)
      .from(credentials)
      .where(and(eq(credentials.id, id), eq(credentials.userId, userId)))
      .limit(1);

    const row = rows[0];
    return row ? this.freeze(row) : null;
  }

  async getDecryptedKey(userId: string, id: string): Promise<string> {
    const rows = await this.db
      .select({
        encryptedKey: credentials.encryptedKey,
        expiresAt: credentials.expiresAt,
      })
      .from(credentials)
      .where(and(eq(credentials.id, id), eq(credentials.userId, userId)))
      .limit(1);

    const row = rows[0];
    if (!row) {
      throw new Error('Credential not found or access denied');
    }
    if (row.expiresAt !== null && row.expiresAt < new Date()) {
      throw new Error('Credential has expired');
    }
    return decryptCredential(row.encryptedKey);
  }

  async create(userId: string, input: CreateCredentialInput): Promise<SafeCredential> {
    return this.db.transaction(async (tx) => {
      const serverRows = await tx
        .select({ id: mcpServers.id })
        .from(mcpServers)
        .where(and(eq(mcpServers.id, input.serverId), eq(mcpServers.userId, userId)))
        .limit(1);

      if (serverRows.length === 0) {
        throw new Error('Server not found or access denied');
      }

      const encryptedKey = encryptCredential(input.plaintextKey);

      const rows = await tx
        .insert(credentials)
        .values({
          serverId: input.serverId,
          userId,
          label: input.label,
          encryptedKey,
          authType: input.authType,
          expiresAt: input.expiresAt ?? null,
        })
        .returning(safeColumns);

      return this.freeze(rows[0]!);
    });
  }

  async update(userId: string, id: string, input: UpdateCredentialInput): Promise<SafeCredential> {
    return this.db.transaction(async (tx) => {
      const updateValues: Record<string, unknown> = {};
      if (input.label !== undefined) updateValues['label'] = input.label;
      if (input.authType !== undefined) updateValues['authType'] = input.authType;
      if (input.expiresAt !== undefined) updateValues['expiresAt'] = input.expiresAt;
      if (input.plaintextKey !== undefined) {
        updateValues['encryptedKey'] = encryptCredential(input.plaintextKey);
      }

      if (Object.keys(updateValues).length === 0) {
        throw new Error('No credential fields provided for update');
      }

      const rows = await tx
        .update(credentials)
        .set(updateValues)
        .where(and(eq(credentials.id, id), eq(credentials.userId, userId)))
        .returning(safeColumns);

      if (rows.length === 0) {
        throw new Error('Credential not found or access denied');
      }

      return this.freeze(rows[0]!);
    });
  }

  async delete(userId: string, id: string): Promise<void> {
    const result = await this.db
      .delete(credentials)
      .where(and(eq(credentials.id, id), eq(credentials.userId, userId)))
      .returning({ id: credentials.id });

    if (result.length === 0) {
      throw new Error('Credential not found or access denied');
    }
  }
}
