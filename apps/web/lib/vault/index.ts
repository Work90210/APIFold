import { encrypt as rawEncrypt } from './encrypt';
import { decrypt as rawDecrypt } from './decrypt';

export { clearKeyCache } from './derive-key';
export { validateVaultSecret, validateVaultSalt } from './validate';

function getSecret(): string {
  const secret = process.env['VAULT_SECRET'];
  if (!secret || secret.length < 32) {
    throw new Error('VAULT_SECRET environment variable is required and must be at least 32 characters.');
  }
  return secret;
}

function getSalt(): string {
  const salt = process.env['VAULT_SALT'];
  if (!salt || salt.length < 32) {
    throw new Error('VAULT_SALT environment variable is required and must be at least 32 characters.');
  }
  return salt;
}

export function encryptCredential(plaintext: string): string {
  return rawEncrypt(plaintext, getSecret(), getSalt());
}

export function decryptCredential(ciphertext: string): string {
  return rawDecrypt(ciphertext, getSecret(), getSalt());
}
