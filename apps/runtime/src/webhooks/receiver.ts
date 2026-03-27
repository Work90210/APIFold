import type { Request, Response, Router } from 'express';
import express from 'express';
import type { Redis } from 'ioredis';

import type { Logger } from '../observability/logger.js';
import type { ServerRegistry } from '../registry/server-registry.js';
import type { DbClient } from '../mcp/protocol-handler.js';
import type { SignatureValidator } from './signature.js';
import type { WebhookNotifier } from './notifier.js';

const REDIS_KEY_PREFIX = 'webhook:latest:';
const REDIS_TTL_SEC = 86_400; // 24 hours
const MAX_PAYLOAD_BYTES = 256 * 1024; // 256 KB

const EVENT_NAME_PATTERN = /^[a-zA-Z0-9_.:-]+$/;
const SERVER_SLUG_PATTERN = /^[a-z0-9-]+$/;

export interface WebhookReceiverDeps {
  readonly logger: Logger;
  readonly registry: ServerRegistry;
  readonly redis: Redis;
  readonly db?: DbClient;
  readonly notifier: WebhookNotifier;
  readonly validators?: ReadonlyMap<string, SignatureValidator>;
}

interface RequestWithRawBody extends Request {
  readonly rawBody?: Buffer;
}

function isValidEventName(name: string): boolean {
  return name.length >= 1 && name.length <= 200 && EVENT_NAME_PATTERN.test(name);
}

function isValidServerSlug(slug: string): boolean {
  return slug.length >= 1 && slug.length <= 50 && SERVER_SLUG_PATTERN.test(slug);
}

export function createWebhookRouter(deps: WebhookReceiverDeps): Router {
  const { logger, registry, redis, db, notifier, validators } = deps;
  const router = express.Router();

  router.post('/webhooks/:serverSlug/:eventName', async (req: Request, res: Response) => {
    const { serverSlug, eventName } = req.params;

    if (!serverSlug || !eventName) {
      res.status(400).json({ error: 'Missing serverSlug or eventName' });
      return;
    }

    if (!isValidServerSlug(serverSlug)) {
      res.status(400).json({ error: 'Invalid server slug' });
      return;
    }

    if (!isValidEventName(eventName)) {
      res.status(400).json({ error: 'Invalid event name' });
      return;
    }

    const server = registry.getBySlug(serverSlug);
    if (!server || !server.isActive) {
      res.status(404).json({ error: 'Server not found' });
      return;
    }

    // Use raw bytes captured by the verify callback for signature validation.
    // Falls back to re-serialized JSON only when no signature check is needed.
    const rawBody = (req as RequestWithRawBody).rawBody;
    const rawBodyStr = rawBody ? rawBody.toString('utf8') : JSON.stringify(req.body);

    // Use actual byte length, not JS string length (which counts UTF-16 code units)
    const bodyByteLength = rawBody ? rawBody.byteLength : Buffer.byteLength(rawBodyStr, 'utf8');
    if (bodyByteLength > MAX_PAYLOAD_BYTES) {
      res.status(413).json({ error: 'Payload too large' });
      return;
    }

    // Validate webhook signature if a validator is configured for this server
    const validator = validators?.get(server.id);
    if (validator) {
      const isValid = validator.validate(rawBodyStr, req.headers);
      if (!isValid) {
        logger.warn({ slug: serverSlug, eventName }, 'Webhook signature validation failed');
        res.status(401).json({ error: 'Invalid webhook signature' });
        return;
      }
    }

    const payload = req.body as Record<string, unknown>;

    try {
      // 1. Store latest state in Redis (fast reads for resources/read)
      const redisKey = `${REDIS_KEY_PREFIX}${server.id}:${eventName}`;
      await redis.set(redisKey, JSON.stringify(payload), 'EX', REDIS_TTL_SEC);

      // 2. Persist to webhook_events table (durable storage)
      if (db) {
        db.query(
          `INSERT INTO webhook_events (server_id, event_name, payload)
           VALUES ($1, $2, $3)`,
          [server.id, eventName, JSON.stringify(payload)],
        ).catch((err) => {
          logger.warn({ err, serverId: server.id, eventName }, 'Failed to persist webhook event');
        });
      }

      // 3. Notify connected SSE agents
      notifier.notify(server.slug, eventName, payload);

      logger.info({ slug: serverSlug, eventName }, 'Webhook event received');
      res.status(200).json({ ok: true });
    } catch (err) {
      logger.error({ err, slug: serverSlug, eventName }, 'Failed to process webhook');
      res.status(500).json({ error: 'Internal error' });
    }
  });

  return router;
}
