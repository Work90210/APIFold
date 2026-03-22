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
  scopes: credentials.scopes,
  tokenEndpoint: credentials.tokenEndpoint,
  clientId: credentials.clientId,
  tokenExpiresAt: credentials.tokenExpiresAt,
  provider: credentials.provider,
} as const;

function assertNotExpired(expiresAt: Date | null): void {
  if (expiresAt !== null && expiresAt < new Date()) {
    throw new Error('Credential has expired');
  }
}

// Drizzle returns nullable columns as T | null. Normalize to match SafeCredential shape.
function toSafeCredential(row: Record<string, unknown>): SafeCredential {
  return {
    id: row['id'] as string,
    serverId: row['serverId'] as string,
    userId: row['userId'] as string,
    label: row['label'] as string,
    authType: row['authType'] as SafeCredential['authType'],
    expiresAt: (row['expiresAt'] as Date | null) ?? null,
    createdAt: row['createdAt'] as Date,
    updatedAt: row['updatedAt'] as Date,
    scopes: (row['scopes'] as string[] | null) ?? [],
    tokenEndpoint: (row['tokenEndpoint'] as string | null) ?? null,
    clientId: (row['clientId'] as string | null) ?? null,
    tokenExpiresAt: (row['tokenExpiresAt'] as Date | null) ?? null,
    provider: (row['provider'] as string | null) ?? null,
  };
}

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
    if (filters?.provider) {
      conditions.push(eq(credentials.provider, filters.provider));
    }

    const rows = await this.db
      .select(safeColumns)
      .from(credentials)
      .where(and(...conditions))
      .orderBy(credentials.createdAt)
      .limit(DEFAULT_QUERY_LIMIT);

    return this.freezeAll(rows.map(toSafeCredential));
  }

  async findById(userId: string, id: string): Promise<SafeCredential | null> {
    const rows = await this.db
      .select(safeColumns)
      .from(credentials)
      .where(and(eq(credentials.id, id), eq(credentials.userId, userId)))
      .limit(1);

    const row = rows[0];
    return row ? this.freeze(toSafeCredential(row)) : null;
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
    assertNotExpired(row.expiresAt);
    return decryptCredential(row.encryptedKey);
  }

  async getDecryptedRefreshToken(userId: string, id: string): Promise<string | null> {
    const rows = await this.db
      .select({
        encryptedRefreshToken: credentials.encryptedRefreshToken,
        expiresAt: credentials.expiresAt,
      })
      .from(credentials)
      .where(and(eq(credentials.id, id), eq(credentials.userId, userId)))
      .limit(1);

    const row = rows[0];
    if (!row) {
      throw new Error('Credential not found or access denied');
    }
    assertNotExpired(row.expiresAt);
    if (!row.encryptedRefreshToken) {
      return null;
    }
    return decryptCredential(row.encryptedRefreshToken);
  }

  async getDecryptedClientSecret(userId: string, id: string): Promise<string | null> {
    const rows = await this.db
      .select({
        encryptedClientSecret: credentials.encryptedClientSecret,
        expiresAt: credentials.expiresAt,
      })
      .from(credentials)
      .where(and(eq(credentials.id, id), eq(credentials.userId, userId)))
      .limit(1);

    const row = rows[0];
    if (!row) {
      throw new Error('Credential not found or access denied');
    }
    assertNotExpired(row.expiresAt);
    if (!row.encryptedClientSecret) {
      return null;
    }
    return decryptCredential(row.encryptedClientSecret);
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
          scopes: input.scopes ? [...input.scopes] : [],
          tokenEndpoint: input.tokenEndpoint ?? null,
          clientId: input.clientId ?? null,
          tokenExpiresAt: input.tokenExpiresAt ?? null,
          provider: input.provider ?? null,
          encryptedRefreshToken: input.refreshToken
            ? encryptCredential(input.refreshToken)
            : null,
          encryptedClientSecret: input.clientSecret
            ? encryptCredential(input.clientSecret)
            : null,
        })
        .returning(safeColumns);

      return this.freeze(toSafeCredential(rows[0]!));
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
      if (input.refreshToken !== undefined) {
        updateValues['encryptedRefreshToken'] = input.refreshToken !== null
          ? encryptCredential(input.refreshToken)
          : null;
      }
      if (input.scopes !== undefined) updateValues['scopes'] = [...input.scopes];
      if (input.tokenEndpoint !== undefined) updateValues['tokenEndpoint'] = input.tokenEndpoint;
      if (input.clientId !== undefined) updateValues['clientId'] = input.clientId;
      if (input.clientSecret !== undefined) {
        updateValues['encryptedClientSecret'] = input.clientSecret !== null
          ? encryptCredential(input.clientSecret)
          : null;
      }
      if (input.tokenExpiresAt !== undefined) updateValues['tokenExpiresAt'] = input.tokenExpiresAt;
      if (input.provider !== undefined) updateValues['provider'] = input.provider;

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

      return this.freeze(toSafeCredential(rows[0]!));
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
