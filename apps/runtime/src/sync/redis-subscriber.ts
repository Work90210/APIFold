import type { Redis } from 'ioredis';

import type { SessionManager } from '../mcp/session-manager.js';
import type { Logger } from '../observability/logger.js';
import type { CredentialCache } from '../registry/credential-cache.js';
import type { ServerRegistry } from '../registry/server-registry.js';
import type { ToolLoader } from '../registry/tool-loader.js';

import type { PostgresLoaderDeps } from './postgres-loader.js';
import { reloadServer } from './postgres-loader.js';

export type ServerEvent =
  | { readonly type: 'server:created'; readonly serverId: string }
  | { readonly type: 'server:updated'; readonly serverId: string }
  | { readonly type: 'server:deleted'; readonly serverId: string; readonly slug: string };

const CHANNEL = 'mcp:server-events';

export interface RedisSubscriberDeps {
  readonly redis: Redis;
  readonly logger: Logger;
  readonly registry: ServerRegistry;
  readonly toolLoader: ToolLoader;
  readonly credentialCache: CredentialCache;
  readonly sessionManager: SessionManager;
  readonly pgLoaderDeps: PostgresLoaderDeps;
}

export class RedisSubscriber {
  private readonly redis: Redis;
  private readonly logger: Logger;
  private readonly registry: ServerRegistry;
  private readonly toolLoader: ToolLoader;
  private readonly credentialCache: CredentialCache;
  private readonly sessionManager: SessionManager;
  private readonly pgDeps: PostgresLoaderDeps;
  private isSubscribed = false;

  constructor(deps: RedisSubscriberDeps) {
    this.redis = deps.redis;
    this.logger = deps.logger;
    this.registry = deps.registry;
    this.toolLoader = deps.toolLoader;
    this.credentialCache = deps.credentialCache;
    this.sessionManager = deps.sessionManager;
    this.pgDeps = deps.pgLoaderDeps;
  }

  async subscribe(): Promise<void> {
    await this.redis.subscribe(CHANNEL);
    this.isSubscribed = true;

    this.redis.on('message', (channel: string, message: string) => {
      if (channel !== CHANNEL) return;
      this.handleMessage(message).catch((err) => {
        this.logger.error({ err }, 'Error handling Redis event');
      });
    });

    this.logger.info({ channel: CHANNEL }, 'Redis subscriber connected');
  }

  async disconnect(): Promise<void> {
    if (this.isSubscribed) {
      await this.redis.unsubscribe(CHANNEL);
      this.isSubscribed = false;
    }
    this.logger.info('Redis subscriber disconnected');
  }

  private async handleMessage(raw: string): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.logger.warn({ raw }, 'Invalid Redis event message');
      return;
    }

    if (!isValidServerEvent(parsed)) {
      this.logger.warn({ parsed }, 'Malformed Redis server event');
      return;
    }

    const event = parsed;
    this.logger.info({ event }, 'Processing server event');

    switch (event.type) {
      case 'server:created':
      case 'server:updated':
        await this.handleUpsert(event.serverId);
        break;
      case 'server:deleted':
        this.handleDelete(event.serverId, event.slug);
        break;
    }
  }

  private async handleUpsert(serverId: string): Promise<void> {
    await reloadServer(this.pgDeps, serverId);
    this.toolLoader.evict(serverId);
    this.credentialCache.evict(serverId);
  }

  private handleDelete(serverId: string, slug: string): void {
    this.registry.remove(serverId);
    this.toolLoader.evict(serverId);
    this.credentialCache.evict(serverId);
    this.sessionManager.closeAllForServer(slug);
  }
}

function isValidServerEvent(value: unknown): value is ServerEvent {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (obj['type'] === 'server:created' || obj['type'] === 'server:updated') {
    return typeof obj['serverId'] === 'string' && obj['serverId'].length > 0;
  }

  if (obj['type'] === 'server:deleted') {
    return (
      typeof obj['serverId'] === 'string' && obj['serverId'].length > 0 &&
      typeof obj['slug'] === 'string' && obj['slug'].length > 0
    );
  }

  return false;
}
