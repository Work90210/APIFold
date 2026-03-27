import { createHash, scryptSync, timingSafeEqual, randomBytes } from 'node:crypto';

import type { RequestHandler } from 'express';

import type { ServerRegistry } from '../registry/server-registry.js';

const ENDPOINT_ID_PATTERN = /^[a-f0-9]{12}$/;
const SCRYPT_PREFIX = 'scrypt:';
// IMPORTANT: These scrypt parameters must match those in
// apps/web/lib/db/repositories/server.repository.ts
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;

/**
 * Parse a stored token hash and determine its algorithm.
 *
 * Two formats are supported:
 *   - Legacy SHA-256: plain 64-char hex string (32 bytes)
 *   - Scrypt: `scrypt:<salt_hex>:<hash_hex>`
 */
function parseStoredHash(stored: string): {
  readonly algorithm: 'sha256' | 'scrypt';
  readonly hash: Buffer;
  readonly salt?: Buffer;
} {
  if (stored.startsWith(SCRYPT_PREFIX)) {
    const parts = stored.slice(SCRYPT_PREFIX.length).split(':');
    if (parts.length === 2 && parts[0] && parts[1]) {
      return {
        algorithm: 'scrypt',
        salt: Buffer.from(parts[0], 'hex'),
        hash: Buffer.from(parts[1], 'hex'),
      };
    }
  }
  // Legacy: plain hex SHA-256
  return { algorithm: 'sha256', hash: Buffer.from(stored, 'hex') };
}

/**
 * Verify a plaintext token against a stored hash (SHA-256 or scrypt).
 */
function verifyToken(token: string, stored: string): boolean {
  const parsed = parseStoredHash(stored);

  if (parsed.algorithm === 'scrypt' && parsed.salt) {
    const derived = scryptSync(token, parsed.salt, parsed.hash.length, {
      N: SCRYPT_COST,
      r: SCRYPT_BLOCK_SIZE,
      p: SCRYPT_PARALLELIZATION,
    });
    return derived.length === parsed.hash.length && timingSafeEqual(derived, parsed.hash);
  }

  // Legacy SHA-256
  const provided = createHash('sha256').update(token).digest();
  if (parsed.hash.length !== 32 || provided.length !== parsed.hash.length) {
    return false;
  }
  return timingSafeEqual(provided, parsed.hash);
}

/**
 * Check if a stored hash is using the legacy SHA-256 format.
 */
function isLegacyHash(stored: string): boolean {
  return !stored.startsWith(SCRYPT_PREFIX);
}

/**
 * Upgrade a legacy SHA-256 hash to scrypt. Returns the new hash string
 * to be persisted, or null if the token was already scrypt.
 */
function upgradeToScrypt(token: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(token, salt, SCRYPT_KEY_LENGTH, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
  });
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

export interface TokenUpgradeCallback {
  (serverId: string, oldTokenHash: string, newTokenHash: string): void;
}

/** Track in-flight upgrades to prevent concurrent re-hashing of the same server. */
const upgradesInFlight = new Set<string>();

// ── Brute-force protection ──────────────────────────────────────────

const MAX_FAILURES = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000; // Prune expired entries every 60s

interface FailureRecord {
  count: number;
  firstFailureAt: number;
  lockedUntil: number;
}

/**
 * In-memory rate limiter for failed auth attempts.
 *
 * Keyed by IP + server slug to prevent cross-server interference.
 * After MAX_FAILURES consecutive failures within the lockout window,
 * the IP is locked out for LOCKOUT_DURATION_MS. Successful auth resets the counter.
 *
 * In-memory is intentional — this is per-worker state. A distributed
 * attacker hitting multiple workers gets MAX_FAILURES * workerCount
 * attempts, but scrypt's 50-100ms cost makes that prohibitively slow anyway.
 */
class AuthRateLimiter {
  private readonly failures = new Map<string, FailureRecord>();
  private readonly cleanupTimer: ReturnType<typeof setInterval>;

  constructor() {
    this.cleanupTimer = setInterval(() => this.prune(), CLEANUP_INTERVAL_MS);
    this.cleanupTimer.unref();
  }

  private key(ip: string, serverIdentifier: string): string {
    return `${ip}:${serverIdentifier}`;
  }

  isLocked(ip: string, serverIdentifier: string): { locked: boolean; retryAfterSecs?: number } {
    const record = this.failures.get(this.key(ip, serverIdentifier));
    if (!record) return { locked: false };

    const now = Date.now();
    if (record.lockedUntil > now) {
      return { locked: true, retryAfterSecs: Math.ceil((record.lockedUntil - now) / 1000) };
    }

    // Lockout expired — reset
    if (record.lockedUntil > 0) {
      this.failures.delete(this.key(ip, serverIdentifier));
    }
    return { locked: false };
  }

  recordFailure(ip: string, serverIdentifier: string): void {
    const k = this.key(ip, serverIdentifier);
    const now = Date.now();
    const existing = this.failures.get(k);

    if (!existing) {
      this.failures.set(k, { count: 1, firstFailureAt: now, lockedUntil: 0 });
      return;
    }

    existing.count += 1;
    if (existing.count >= MAX_FAILURES) {
      existing.lockedUntil = now + LOCKOUT_DURATION_MS;
    }
  }

  recordSuccess(ip: string, serverIdentifier: string): void {
    this.failures.delete(this.key(ip, serverIdentifier));
  }

  private prune(): void {
    const now = Date.now();
    for (const [key, record] of this.failures) {
      // Remove entries whose lockout has expired or that are older than the lockout window
      if (record.lockedUntil > 0 && record.lockedUntil <= now) {
        this.failures.delete(key);
      } else if (now - record.firstFailureAt > LOCKOUT_DURATION_MS) {
        this.failures.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
    this.failures.clear();
  }
}

/**
 * Per-server access token authentication middleware.
 *
 * Each server has its own `af_`-prefixed bearer token. The hash is
 * stored in the L0 registry. Supports both legacy SHA-256 hashes and
 * scrypt hashes (format: `scrypt:<salt>:<hash>`). Legacy hashes are
 * auto-upgraded to scrypt on successful authentication.
 *
 * The middleware extracts the token from:
 *   1. `Authorization: Bearer af_xxx` header (preferred)
 *   2. `?token=af_xxx` query parameter (for SSE clients that can't set headers)
 *
 * Authentication flow:
 *   - Server has `tokenHash` → token MUST match (per-server auth)
 *   - Server has no `tokenHash` → fall back to global `MCP_API_KEY`
 *   - Neither configured → reject (zero-trust)
 *
 * On successful auth, `req.serverTokenVerified = true` is set so the SSE
 * transport can bind the session as authenticated (no token needed on
 * subsequent message POSTs for that session).
 */
export function createServerTokenAuth(
  globalApiKey: string | undefined,
  registry: ServerRegistry,
  onTokenUpgrade?: TokenUpgradeCallback,
): RequestHandler {
  // Hash the global API key with scrypt at startup (one-time cost)
  const globalKeyHash = globalApiKey
    ? (() => {
        const salt = Buffer.from('apifold:global-api-key:v1', 'utf8');
        return scryptSync(globalApiKey, salt, SCRYPT_KEY_LENGTH, {
          N: SCRYPT_COST,
          r: SCRYPT_BLOCK_SIZE,
          p: SCRYPT_PARALLELIZATION,
        });
      })()
    : null;
  const globalKeySalt = Buffer.from('apifold:global-api-key:v1', 'utf8');
  const rateLimiter = new AuthRateLimiter();

  return (req, res, next) => {
    const identifier = req.params['slug'] ?? req.params['identifier'];
    if (!identifier) {
      res.status(400).json({ error: 'Missing server identifier' });
      return;
    }

    // Resolve server from registry
    const server = ENDPOINT_ID_PATTERN.test(identifier)
      ? registry.getByEndpointId(identifier)
      : registry.getBySlug(identifier);

    if (!server) {
      // Let transport handler return 404 — don't reveal existence info here
      next();
      return;
    }

    const clientIp = req.ip ?? req.socket.remoteAddress ?? 'unknown';

    // Check brute-force lockout before doing any expensive hashing
    const lockStatus = rateLimiter.isLocked(clientIp, identifier);
    if (lockStatus.locked) {
      res.status(429).json({
        error: 'Too many failed authentication attempts. Try again later.',
        retryAfterSeconds: lockStatus.retryAfterSecs,
      });
      return;
    }

    // Extract token from header or query parameter
    const header = req.headers['authorization'];
    const headerToken = typeof header === 'string' && header.startsWith('Bearer ')
      ? header.slice(7)
      : null;
    const queryToken = typeof req.query['token'] === 'string'
      ? req.query['token']
      : null;
    const token = headerToken ?? queryToken;

    // Case 1: Server has a per-server token — validate it
    if (server.tokenHash) {
      if (!token) {
        res.status(401).json({ error: 'Authorization required. Provide Bearer token for this server.' });
        return;
      }

      if (!verifyToken(token, server.tokenHash)) {
        rateLimiter.recordFailure(clientIp, identifier);
        res.status(401).json({ error: 'Invalid access token' });
        return;
      }

      rateLimiter.recordSuccess(clientIp, identifier);

      // Auto-upgrade legacy SHA-256 hashes to scrypt on successful auth.
      // Guard against concurrent upgrades: only one in-flight upgrade per server.
      if (isLegacyHash(server.tokenHash) && onTokenUpgrade && !upgradesInFlight.has(server.id)) {
        upgradesInFlight.add(server.id);
        const oldHash = server.tokenHash;
        try {
          const upgraded = upgradeToScrypt(token);
          onTokenUpgrade(server.id, oldHash, upgraded);
        } finally {
          upgradesInFlight.delete(server.id);
        }
      }

      // Mark request as authenticated for session binding in SSE transport
      (req as unknown as Record<string, unknown>)['serverTokenVerified'] = true;
      next();
      return;
    }

    // Case 2: No per-server token — fall back to global MCP_API_KEY
    if (globalKeyHash) {
      if (!token) {
        res.status(401).json({ error: 'Authorization required. Provide Bearer token.' });
        return;
      }

      const derived = scryptSync(token, globalKeySalt, globalKeyHash.length, {
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: SCRYPT_PARALLELIZATION,
      });
      if (!timingSafeEqual(globalKeyHash, derived)) {
        rateLimiter.recordFailure(clientIp, identifier);
        res.status(401).json({ error: 'Invalid API key' });
        return;
      }

      rateLimiter.recordSuccess(clientIp, identifier);
      (req as unknown as Record<string, unknown>)['serverTokenVerified'] = true;
      next();
      return;
    }

    // Case 3: No per-server token AND no global key — reject
    res.status(401).json({
      error: 'This server requires an access token. Generate one in the dashboard.',
    });
  };
}
