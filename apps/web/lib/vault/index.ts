import { encrypt as rawEncrypt } from './encrypt.js';
import { decrypt as rawDecrypt } from './decrypt.js';

export { clearKeyCache } from './derive-key.js';
export { validateVaultSecret, validateVaultSalt } from './validate.js';

// Fail-fast: validate at module load, not per-call
let cachedSecret: string | null = null;
let cachedSalt: string | null = null;

function getSecret(): string {
  if (cachedSecret === null) {
    const secret = process.env['VAULT_SECRET'];
    if (!secret || secret.length < 32) {
      throw new Error('VAULT_SECRET environment variable is required and must be at least 32 characters.');
    }
    cachedSecret = secret;
  }
  return cachedSecret;
}

function getSalt(): string {
  if (cachedSalt === null) {
    const salt = process.env['VAULT_SALT'];
    if (!salt || salt.length < 32) {
      throw new Error('VAULT_SALT environment variable is required and must be at least 32 characters.');
    }
    cachedSalt = salt;
  }
  return cachedSalt;
}

export function encryptCredential(plaintext: string): string {
  return rawEncrypt(plaintext, getSecret(), getSalt());
}

export function decryptCredential(ciphertext: string): string {
  return rawDecrypt(ciphertext, getSecret(), getSalt());
}
