import { eq, and, desc } from 'drizzle-orm';
import type { RequestLog, CreateRequestLogInput } from '@apifold/types';
import { requestLogs } from '../schema/request-logs.js';
import { mcpServers } from '../schema/servers.js';
import { mcpTools } from '../schema/tools.js';
import { BaseRepository } from './base.repository.js';
import { DEFAULT_QUERY_LIMIT, MAX_QUERY_LIMIT } from './constants.js';

export interface LogFilters {
  readonly serverId?: string;
  readonly requestId?: string;
  readonly limit?: number;
}

type NoOp = Record<string, never>;

export class LogRepository extends BaseRepository<
  RequestLog,
  CreateRequestLogInput,
  NoOp,
  LogFilters
> {
  async findAll(userId: string, filters?: LogFilters): Promise<readonly RequestLog[]> {
    const conditions = [eq(requestLogs.userId, userId)];

    if (filters?.serverId) {
      conditions.push(eq(requestLogs.serverId, filters.serverId));
    }
    if (filters?.requestId) {
      conditions.push(eq(requestLogs.requestId, filters.requestId));
    }

    const rows = await this.db
      .select()
      .from(requestLogs)
      .where(and(...conditions))
      .orderBy(desc(requestLogs.timestamp))
      .limit(Math.min(filters?.limit ?? DEFAULT_QUERY_LIMIT, MAX_QUERY_LIMIT));

    return this.freezeAll(rows as RequestLog[]);
  }

  async findById(userId: string, id: string): Promise<RequestLog | null> {
    const rows = await this.db
      .select()
      .from(requestLogs)
      .where(and(eq(requestLogs.id, id), eq(requestLogs.userId, userId)))
      .limit(1);

    const row = rows[0];
    return row ? this.freeze(row as RequestLog) : null;
  }

  async create(userId: string, input: CreateRequestLogInput): Promise<RequestLog> {
    return this.db.transaction(async (tx) => {
      const serverRows = await tx
        .select({ id: mcpServers.id })
        .from(mcpServers)
        .where(and(eq(mcpServers.id, input.serverId), eq(mcpServers.userId, userId)))
        .limit(1);

      if (serverRows.length === 0) {
        throw new Error('Server not found or access denied');
      }

      // Verify toolId belongs to the same server and user
      if (input.toolId) {
        const toolRows = await tx
          .select({ id: mcpTools.id })
          .from(mcpTools)
          .where(and(
            eq(mcpTools.id, input.toolId),
            eq(mcpTools.serverId, input.serverId),
          ))
          .limit(1);

        if (toolRows.length === 0) {
          throw new Error('Tool not found or access denied');
        }
      }

      const rows = await tx
        .insert(requestLogs)
        .values({
          serverId: input.serverId,
          toolId: input.toolId ?? null,
          userId,
          requestId: input.requestId,
          method: input.method,
          path: input.path,
          statusCode: input.statusCode,
          durationMs: input.durationMs,
        })
        .returning();

      return this.freeze(rows[0]! as RequestLog);
    });
  }

  async update(): Promise<RequestLog> {
    throw new Error('Logs are append-only and cannot be updated');
  }

  async delete(): Promise<void> {
    throw new Error('Logs are append-only and cannot be deleted');
  }
}
