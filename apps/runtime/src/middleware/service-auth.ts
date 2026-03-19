import { createHash, timingSafeEqual } from 'node:crypto';

import type { RequestHandler } from 'express';

export function createServiceAuth(runtimeSecret: string): RequestHandler {
  // Hash the secret so comparisons are always fixed-length (32 bytes).
  // This eliminates the timing oracle from length mismatch short-circuit.
  const secretHash = createHash('sha256').update(runtimeSecret).digest();

  return (req, res, next) => {
    const provided = req.headers['x-runtime-secret'];
    if (typeof provided !== 'string') {
      res.status(401).json({ error: 'Missing service secret' });
      return;
    }

    const providedHash = createHash('sha256').update(provided).digest();
    if (!timingSafeEqual(secretHash, providedHash)) {
      res.status(401).json({ error: 'Invalid service secret' });
      return;
    }

    next();
  };
}
