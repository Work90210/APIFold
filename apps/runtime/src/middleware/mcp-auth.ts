import { createHash, timingSafeEqual } from 'node:crypto';

import type { RequestHandler } from 'express';

/**
 * Optional API key guard for public MCP endpoints.
 * When `mcpApiKey` is configured, all requests must include a valid
 * `Authorization: Bearer <key>` header. When unset, the middleware is a no-op.
 */
export function createMcpAuth(mcpApiKey: string | undefined): RequestHandler {
  if (!mcpApiKey) {
    return (_req, _res, next) => next();
  }

  const keyHash = createHash('sha256').update(mcpApiKey).digest();

  return (req, res, next) => {
    const header = req.headers['authorization'];
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }

    const token = header.slice(7);
    const tokenHash = createHash('sha256').update(token).digest();

    if (!timingSafeEqual(keyHash, tokenHash)) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    next();
  };
}
