import { pbkdf2Sync, createHash, timingSafeEqual } from 'node:crypto';

import { PBKDF2_ITERATIONS, KEY_LENGTH, PBKDF2_DIGEST } from './constants.js';

let cachedKey: Buffer | null = null;
let cachedSecretHash: Buffer | null = null;
let cachedSaltHash: Buffer | null = null;

function hashToBuffer(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

function zeroAndClear(): void {
  if (cachedKey !== null) cachedKey.fill(0);
  if (cachedSecretHash !== null) cachedSecretHash.fill(0);
  if (cachedSaltHash !== null) cachedSaltHash.fill(0);
}

export function deriveKey(secret: string, salt: string): Buffer {
  const secretHash = hashToBuffer(secret);
  const saltHash = hashToBuffer(salt);

  if (
    cachedKey !== null &&
    cachedSecretHash !== null &&
    cachedSaltHash !== null &&
    timingSafeEqual(cachedSecretHash, secretHash) &&
    timingSafeEqual(cachedSaltHash, saltHash)
  ) {
    return Buffer.from(cachedKey);
  }

  zeroAndClear();

  const key = pbkdf2Sync(secret, salt, PBKDF2_ITERATIONS, KEY_LENGTH, PBKDF2_DIGEST);
  cachedKey = key;
  cachedSecretHash = secretHash;
  cachedSaltHash = saltHash;
  return Buffer.from(key);
}

export function clearKeyCache(): void {
  zeroAndClear();
  cachedKey = null;
  cachedSecretHash = null;
  cachedSaltHash = null;
}

/**
 * Async key derivation using Web Crypto API (crypto.subtle).
 * For edge/browser runtimes where Node.js crypto is unavailable.
 * Feature-flagged: only use when VAULT_USE_WEB_CRYPTO=true.
 */
export async function deriveKeyAsync(secret: string, salt: string): Promise<Buffer> {
  if (typeof globalThis.crypto?.subtle === 'undefined') {
    // Fallback to sync Node.js implementation
    return deriveKey(secret, salt);
  }

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH * 8,
  );

  return Buffer.from(bits);
}
