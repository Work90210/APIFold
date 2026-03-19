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
