import type { Redis } from 'ioredis';

export interface SSESessionInfo {
  readonly connectionId: string;
  readonly serverId: string;
  readonly workerId: string;
  readonly connectedAt: number;
  readonly clientIP: string;
  readonly lastEventId: string;
}

export interface SSESessionStore {
  register(session: SSESessionInfo): Promise<void>;
  unregister(connectionId: string): Promise<void>;
  getByServer(serverId: string): Promise<SSESessionInfo[]>;
  getConnectionCount(): Promise<number>;
  heartbeat(connectionId: string): Promise<void>;
  cleanup(): Promise<number>;
}

const SESSION_TTL = 120; // seconds
const SESSION_PREFIX = 'sse:session:';
const SERVER_SET_PREFIX = 'sse:connections:';
const HEARTBEAT_SET = 'sse:heartbeats';
const HEARTBEAT_STALE_THRESHOLD_MS = 60_000;

export function createSSESessionStore(redis: Redis): SSESessionStore {
  return {
    async register(session: SSESessionInfo): Promise<void> {
      const key = `${SESSION_PREFIX}${session.connectionId}`;
      const pipeline = redis.pipeline();

      pipeline.hset(key, {
        connectionId: session.connectionId,
        serverId: session.serverId,
        workerId: session.workerId,
        connectedAt: String(session.connectedAt),
        clientIP: session.clientIP,
        lastEventId: session.lastEventId,
      });
      pipeline.expire(key, SESSION_TTL);

      // Per-server sorted set (scored by connectedAt)
      pipeline.zadd(
        `${SERVER_SET_PREFIX}${session.serverId}`,
        session.connectedAt,
        session.connectionId,
      );

      // Heartbeat sorted set (scored by lastSeen)
      pipeline.zadd(HEARTBEAT_SET, Date.now(), session.connectionId);

      await pipeline.exec();
    },

    async unregister(connectionId: string): Promise<void> {
      const key = `${SESSION_PREFIX}${connectionId}`;
      const data = await redis.hgetall(key);
      if (!data || !data['serverId']) return;

      const pipeline = redis.pipeline();
      pipeline.del(key);
      pipeline.zrem(`${SERVER_SET_PREFIX}${data['serverId']}`, connectionId);
      pipeline.zrem(HEARTBEAT_SET, connectionId);
      await pipeline.exec();
    },

    async getByServer(serverId: string): Promise<SSESessionInfo[]> {
      const connectionIds = await redis.zrange(
        `${SERVER_SET_PREFIX}${serverId}`,
        0,
        -1,
      );

      if (connectionIds.length === 0) return [];

      const pipeline = redis.pipeline();
      for (const id of connectionIds) {
        pipeline.hgetall(`${SESSION_PREFIX}${id}`);
      }

      const results = await pipeline.exec();
      if (!results) return [];

      const sessions: SSESessionInfo[] = [];
      for (const [err, data] of results) {
        if (err || !data || typeof data !== 'object') continue;
        const d = data as Record<string, string>;
        if (d['connectionId']) {
          sessions.push({
            connectionId: d['connectionId']!,
            serverId: d['serverId'] ?? '',
            workerId: d['workerId'] ?? '',
            connectedAt: parseInt(d['connectedAt'] ?? '0', 10),
            clientIP: d['clientIP'] ?? '',
            lastEventId: d['lastEventId'] ?? '',
          });
        }
      }

      return sessions;
    },

    async getConnectionCount(): Promise<number> {
      return redis.zcard(HEARTBEAT_SET);
    },

    async heartbeat(connectionId: string): Promise<void> {
      const key = `${SESSION_PREFIX}${connectionId}`;
      const pipeline = redis.pipeline();
      pipeline.expire(key, SESSION_TTL);
      pipeline.zadd(HEARTBEAT_SET, Date.now(), connectionId);
      await pipeline.exec();
    },

    async cleanup(): Promise<number> {
      const threshold = Date.now() - HEARTBEAT_STALE_THRESHOLD_MS;
      const staleIds = await redis.zrangebyscore(HEARTBEAT_SET, 0, threshold);

      if (staleIds.length === 0) return 0;

      for (const id of staleIds) {
        await this.unregister(id);
      }

      return staleIds.length;
    },
  };
}
