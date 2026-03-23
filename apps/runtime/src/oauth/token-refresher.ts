import type { Redis } from 'ioredis';

import type { Logger } from '../observability/logger.js';
import type { DbClient } from '../sync/postgres-loader.js';

const TOKEN_REFRESH_TIMEOUT_MS = 15_000;
const TOKEN_EXPIRY_BUFFER_MS = 60_000; // Refresh 60s before expiry
const REFRESH_LOCK_TTL_SECONDS = 30;
const REFRESH_LOCK_PREFIX = 'oauth:refresh_lock:';

export interface OAuthCredentialRow {
  readonly id: string;
  readonly encrypted_key: string;
  readonly auth_type: string;
  readonly token_endpoint: string | null;
  readonly client_id: string | null;
  readonly encrypted_client_secret: string | null;
  readonly encrypted_refresh_token: string | null;
  readonly token_expires_at: string | null;
}

export interface TokenRefresherDeps {
  readonly db: DbClient;
  readonly logger: Logger;
  readonly decryptFn: (encrypted: string) => string;
  readonly encryptFn: (plaintext: string) => string;
  readonly redis?: Redis | null;
}

export function isTokenExpired(tokenExpiresAt: string | null): boolean {
  if (!tokenExpiresAt) return false;
  return new Date(tokenExpiresAt).getTime() - TOKEN_EXPIRY_BUFFER_MS < Date.now();
}

export async function refreshAndUpdateToken(
  deps: TokenRefresherDeps,
  credential: OAuthCredentialRow,
): Promise<string> {
  const { db, logger, decryptFn, encryptFn, redis } = deps;

  if (!credential.token_endpoint || !credential.client_id || !credential.encrypted_refresh_token) {
    throw new CredentialExpiredError('OAuth credential missing refresh configuration');
  }

  // Acquire distributed lock to prevent concurrent refresh races.
  // Providers like Google invalidate old refresh tokens on use — a race would
  // permanently break the credential.
  if (redis) {
    const lockKey = `${REFRESH_LOCK_PREFIX}${credential.id}`;
    const acquired = await redis.set(lockKey, '1', 'EX', REFRESH_LOCK_TTL_SECONDS, 'NX');
    if (!acquired) {
      // Another worker is refreshing — wait briefly then re-read the fresh token
      logger.debug({ credentialId: credential.id }, 'Refresh lock held by another worker, waiting');
      await new Promise((r) => setTimeout(r, 2000));
      const { rows } = await db.query<{ readonly encrypted_key: string }>(
        'SELECT encrypted_key FROM credentials WHERE id = $1',
        [credential.id],
      );
      const fresh = rows[0];
      if (!fresh) throw new CredentialExpiredError('Credential not found after lock wait');
      return decryptFn(fresh.encrypted_key);
    }
    // Lock acquired — proceed with refresh, release in finally block
    try {
      return await doRefresh(db, logger, decryptFn, encryptFn, credential);
    } finally {
      await redis.del(lockKey).catch(() => {});
    }
  }

  // No Redis available — proceed without lock (single-worker mode)
  return doRefresh(db, logger, decryptFn, encryptFn, credential);
}

async function doRefresh(
  db: DbClient,
  logger: Logger,
  decryptFn: (encrypted: string) => string,
  encryptFn: (plaintext: string) => string,
  credential: OAuthCredentialRow,
): Promise<string> {
  // These are guaranteed non-null by the caller's guard in refreshAndUpdateToken
  const tokenEndpoint = credential.token_endpoint!;
  const clientId = credential.client_id!;
  const encryptedRefreshToken = credential.encrypted_refresh_token!;

  let refreshToken: string;
  let clientSecret: string;
  try {
    refreshToken = decryptFn(encryptedRefreshToken);
    clientSecret = credential.encrypted_client_secret
      ? decryptFn(credential.encrypted_client_secret)
      : '';
  } catch {
    throw new CredentialExpiredError('Failed to decrypt OAuth credentials');
  }

  // Exchange refresh token for new access token
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TOKEN_REFRESH_TIMEOUT_MS);

  let response: globalThis.Response;
  try {
    response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: controller.signal,
    });
  } catch (err) {
    throw new CredentialExpiredError(
      `Token refresh request failed: ${err instanceof Error ? err.message : 'unknown error'}`,
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const _errorBody = await response.text().catch(() => '');
    logger.warn(
      { credentialId: credential.id, status: response.status },
      'Token refresh failed — credential may need re-authorization',
    );
    throw new CredentialExpiredError(
      `Token refresh failed (HTTP ${response.status})`,
    );
  }

  const json = (await response.json()) as Record<string, unknown>;
  const newAccessToken = String(json['access_token'] ?? '');
  const newRefreshToken = json['refresh_token'] ? String(json['refresh_token']) : null;
  const expiresIn = typeof json['expires_in'] === 'number' ? json['expires_in'] : null;

  if (!newAccessToken) {
    throw new CredentialExpiredError('Token refresh returned empty access token');
  }

  // Atomically update the credential with new tokens
  const tokenExpiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null;

  const encryptedKey = encryptFn(newAccessToken);
  const encryptedRefresh = newRefreshToken ? encryptFn(newRefreshToken) : null;

  // Build UPDATE query dynamically based on whether we got a new refresh token
  if (encryptedRefresh) {
    await db.query(
      `UPDATE credentials
       SET encrypted_key = $1,
           encrypted_refresh_token = $2,
           token_expires_at = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [encryptedKey, encryptedRefresh, tokenExpiresAt, credential.id],
    );
  } else {
    await db.query(
      `UPDATE credentials
       SET encrypted_key = $1,
           token_expires_at = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [encryptedKey, tokenExpiresAt, credential.id],
    );
  }

  logger.info(
    { credentialId: credential.id, expiresIn },
    'OAuth token refreshed successfully',
  );

  return newAccessToken;
}

export class CredentialExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CredentialExpiredError';
  }
}
