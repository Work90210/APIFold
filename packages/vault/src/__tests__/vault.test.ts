import { describe, it, expect, afterEach } from 'vitest';

import { decrypt } from '../decrypt.js';
import { deriveKey, clearKeyCache } from '../derive-key.js';
import { encrypt } from '../encrypt.js';
import { validateVaultSecret, validateVaultSalt } from '../validate.js';

const TEST_SECRET = 'a'.repeat(32) + 'b'.repeat(16); // 48 chars
const TEST_SALT = 'c'.repeat(64); // 64 hex chars

describe('Vault', () => {
  afterEach(() => {
    clearKeyCache();
  });

  describe('encrypt/decrypt round-trip', () => {
    it('should encrypt and decrypt a simple string', () => {
      const plaintext = 'my-secret-api-key-12345';
      const ciphertext = encrypt(plaintext, TEST_SECRET, TEST_SALT);
      const result = decrypt(ciphertext, TEST_SECRET, TEST_SALT);
      expect(result).toBe(plaintext);
    });

    it('should encrypt and decrypt an empty string', () => {
      const plaintext = '';
      const ciphertext = encrypt(plaintext, TEST_SECRET, TEST_SALT);
      const result = decrypt(ciphertext, TEST_SECRET, TEST_SALT);
      expect(result).toBe(plaintext);
    });

    it('should encrypt and decrypt unicode content', () => {
      const plaintext = 'secret-key with special chars';
      const ciphertext = encrypt(plaintext, TEST_SECRET, TEST_SALT);
      const result = decrypt(ciphertext, TEST_SECRET, TEST_SALT);
      expect(result).toBe(plaintext);
    });

    it('should produce different ciphertexts for the same plaintext (random IV)', () => {
      const plaintext = 'same-plaintext';
      const ct1 = encrypt(plaintext, TEST_SECRET, TEST_SALT);
      const ct2 = encrypt(plaintext, TEST_SECRET, TEST_SALT);
      expect(ct1).not.toBe(ct2);
      expect(decrypt(ct1, TEST_SECRET, TEST_SALT)).toBe(plaintext);
      expect(decrypt(ct2, TEST_SECRET, TEST_SALT)).toBe(plaintext);
    });
  });

  describe('tamper detection', () => {
    it('should reject tampered ciphertext', () => {
      const ciphertext = encrypt('test-data', TEST_SECRET, TEST_SALT);
      const raw = Buffer.from(ciphertext, 'base64');
      raw[14] = raw[14]! ^ 0xff;
      expect(() => decrypt(raw.toString('base64'), TEST_SECRET, TEST_SALT)).toThrow('Decryption failed');
    });

    it('should reject truncated ciphertext', () => {
      const ciphertext = encrypt('test-data', TEST_SECRET, TEST_SALT);
      const raw = Buffer.from(ciphertext, 'base64');
      const truncated = raw.subarray(0, 10).toString('base64');
      expect(() => decrypt(truncated, TEST_SECRET, TEST_SALT)).toThrow('Decryption failed');
    });

    it('should reject wrong version byte', () => {
      const ciphertext = encrypt('test', TEST_SECRET, TEST_SALT);
      const raw = Buffer.from(ciphertext, 'base64');
      raw[0] = 0x02;
      expect(() => decrypt(raw.toString('base64'), TEST_SECRET, TEST_SALT)).toThrow('Decryption failed');
    });

    it('should reject wrong secret', () => {
      const ciphertext = encrypt('secret-data', TEST_SECRET, TEST_SALT);
      expect(() => decrypt(ciphertext, 'z'.repeat(48), TEST_SALT)).toThrow('Decryption failed');
    });
  });

  describe('deriveKey', () => {
    it('should derive a 32-byte key', () => {
      const key = deriveKey(TEST_SECRET, TEST_SALT);
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32);
    });

    it('should return consistent keys for same inputs', () => {
      const key1 = deriveKey(TEST_SECRET, TEST_SALT);
      clearKeyCache();
      const key2 = deriveKey(TEST_SECRET, TEST_SALT);
      expect(key1.equals(key2)).toBe(true);
    });

    it('should return a COPY of the cached key', () => {
      const key1 = deriveKey(TEST_SECRET, TEST_SALT);
      const key2 = deriveKey(TEST_SECRET, TEST_SALT);
      key1.fill(0);
      expect(key2.every((b) => b === 0)).toBe(false);
    });
  });

  describe('validateVaultSecret', () => {
    it('should accept valid secrets', () => {
      expect(validateVaultSecret('a'.repeat(32))).toBe('a'.repeat(32));
    });

    it('should reject undefined', () => {
      expect(() => validateVaultSecret(undefined)).toThrow('VAULT_SECRET');
    });

    it('should reject null', () => {
      expect(() => validateVaultSecret(null)).toThrow('VAULT_SECRET');
    });

    it('should reject empty string with length message', () => {
      expect(() => validateVaultSecret('')).toThrow('at least 32');
    });

    it('should reject short secrets', () => {
      expect(() => validateVaultSecret('short')).toThrow('at least 32');
    });
  });

  describe('validateVaultSalt', () => {
    it('should accept valid salts', () => {
      expect(validateVaultSalt('a'.repeat(32))).toBe('a'.repeat(32));
    });

    it('should reject undefined', () => {
      expect(() => validateVaultSalt(undefined)).toThrow('VAULT_SALT');
    });

    it('should reject null', () => {
      expect(() => validateVaultSalt(null)).toThrow('VAULT_SALT');
    });

    it('should reject empty string with length message', () => {
      expect(() => validateVaultSalt('')).toThrow('at least 32');
    });

    it('should reject short salts', () => {
      expect(() => validateVaultSalt('short')).toThrow('at least 32');
    });
  });
});
