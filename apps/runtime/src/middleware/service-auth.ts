import { createHash, timingSafeEqual } from 'node:crypto';

import type { RequestHandler } from 'express';

export function createServiceAuth(runtimeSecret: string): RequestHandler {
  // SHA-256 is used intentionally for service-to-service auth verification:
  // - The runtime secret is >= 32 random characters (high entropy), so brute-force
  //   resistance comes from the key space, not from hash cost.
  // - Fast verification is desirable for low-latency service-to-service calls.
  // - timingSafeEqual below prevents timing side-channels.
  // This is acceptable per the threat model (NIST SP 800-107 §5.1).
  //
  // Hashing ensures comparisons are always fixed-length (32 bytes),
  // eliminating the timing oracle from length mismatch short-circuit.
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
