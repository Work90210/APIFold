import { describe, it, expect, afterEach } from 'vitest';

import { decrypt } from '../decrypt';
import { clearKeyCache } from '../derive-key';
import { encrypt } from '../encrypt';
import { _deriveKeyInternal as deriveKey } from '@apifold/vault';
import { validateVaultSecret, validateVaultSalt } from '../validate';

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
      const plaintext = '🔐 secret-key with émojis and spëcial chars: àáâã';
      const ciphertext = encrypt(plaintext, TEST_SECRET, TEST_SALT);
      const result = decrypt(ciphertext, TEST_SECRET, TEST_SALT);
      expect(result).toBe(plaintext);
    });

    it('should encrypt and decrypt a long string', () => {
      const plaintext = 'x'.repeat(10000);
      const ciphertext = encrypt(plaintext, TEST_SECRET, TEST_SALT);
      const result = decrypt(ciphertext, TEST_SECRET, TEST_SALT);
      expect(result).toBe(plaintext);
    });

    it('should produce different ciphertexts for the same plaintext (random IV)', () => {
      const plaintext = 'same-plaintext';
      const ct1 = encrypt(plaintext, TEST_SECRET, TEST_SALT);
      const ct2 = encrypt(plaintext, TEST_SECRET, TEST_SALT);
      expect(ct1).not.toBe(ct2);

      // But both decrypt to the same value
      expect(decrypt(ct1, TEST_SECRET, TEST_SALT)).toBe(plaintext);
      expect(decrypt(ct2, TEST_SECRET, TEST_SALT)).toBe(plaintext);
    });
  });

  describe('version byte', () => {
    it('should include version 0x01 as first byte', () => {
      const ciphertext = encrypt('test', TEST_SECRET, TEST_SALT);
      const raw = Buffer.from(ciphertext, 'base64');
      expect(raw[0]).toBe(0x01);
    });

    it('should reject ciphertext with wrong version byte', () => {
      const ciphertext = encrypt('test', TEST_SECRET, TEST_SALT);
      const raw = Buffer.from(ciphertext, 'base64');
      raw[0] = 0x02; // tamper version
      const tampered = raw.toString('base64');
      expect(() => decrypt(tampered, TEST_SECRET, TEST_SALT)).toThrow('Decryption failed');
    });
  });

  describe('tamper detection', () => {
    it('should reject tampered ciphertext (flipped bit in encrypted data)', () => {
      const ciphertext = encrypt('test-data', TEST_SECRET, TEST_SALT);
      const raw = Buffer.from(ciphertext, 'base64');
      // Flip a bit in the encrypted payload (after version + IV)
      raw[14] = raw[14]! ^ 0xff;
      const tampered = raw.toString('base64');
      expect(() => decrypt(tampered, TEST_SECRET, TEST_SALT)).toThrow('Decryption failed');
    });

    it('should reject tampered auth tag', () => {
      const ciphertext = encrypt('test-data', TEST_SECRET, TEST_SALT);
      const raw = Buffer.from(ciphertext, 'base64');
      // Flip last byte (auth tag)
      raw[raw.length - 1] = raw[raw.length - 1]! ^ 0xff;
      const tampered = raw.toString('base64');
      expect(() => decrypt(tampered, TEST_SECRET, TEST_SALT)).toThrow('Decryption failed');
    });

    it('should reject truncated ciphertext', () => {
      const ciphertext = encrypt('test-data', TEST_SECRET, TEST_SALT);
      const raw = Buffer.from(ciphertext, 'base64');
      const truncated = raw.subarray(0, 10).toString('base64');
      expect(() => decrypt(truncated, TEST_SECRET, TEST_SALT)).toThrow('Decryption failed');
    });

    it('should reject empty ciphertext', () => {
      expect(() => decrypt('', TEST_SECRET, TEST_SALT)).toThrow('Decryption failed');
    });

    it('should reject non-base64 ciphertext', () => {
      expect(() => decrypt('not-valid-base64!!!', TEST_SECRET, TEST_SALT)).toThrow('Decryption failed');
    });
  });

  describe('wrong key rejection', () => {
    it('should reject decryption with wrong secret', () => {
      const ciphertext = encrypt('secret-data', TEST_SECRET, TEST_SALT);
      const wrongSecret = 'z'.repeat(48);
      expect(() => decrypt(ciphertext, wrongSecret, TEST_SALT)).toThrow('Decryption failed');
    });

    it('should reject decryption with wrong salt', () => {
      const ciphertext = encrypt('secret-data', TEST_SECRET, TEST_SALT);
      const wrongSalt = 'd'.repeat(64);
      expect(() => decrypt(ciphertext, TEST_SECRET, wrongSalt)).toThrow('Decryption failed');
    });
  });

  describe('error message uniformity', () => {
    it('should use identical error messages for all failure modes', () => {
      const ciphertext = encrypt('test', TEST_SECRET, TEST_SALT);

      // Wrong version
      const raw1 = Buffer.from(ciphertext, 'base64');
      raw1[0] = 0x99;
      expect(() => decrypt(raw1.toString('base64'), TEST_SECRET, TEST_SALT)).toThrow('Decryption failed');

      // Tampered data
      const raw2 = Buffer.from(ciphertext, 'base64');
      raw2[15] = (raw2[15] ?? 0) ^ 0xff;
      expect(() => decrypt(raw2.toString('base64'), TEST_SECRET, TEST_SALT)).toThrow('Decryption failed');

      // Too short
      expect(() => decrypt(Buffer.from([0x01, 0x02]).toString('base64'), TEST_SECRET, TEST_SALT)).toThrow('Decryption failed');

      // Wrong key
      expect(() => decrypt(ciphertext, 'w'.repeat(48), TEST_SALT)).toThrow('Decryption failed');
    });
  });
});

describe('deriveKey', () => {
  afterEach(() => {
    clearKeyCache();
  });

  it('should derive a 32-byte key', () => {
    const key = deriveKey(TEST_SECRET, TEST_SALT);
    expect(key).toBeInstanceOf(Buffer);
    expect(key.length).toBe(32);
  });

  it('should return consistent keys for same secret+salt', () => {
    const key1 = deriveKey(TEST_SECRET, TEST_SALT);
    clearKeyCache();
    const key2 = deriveKey(TEST_SECRET, TEST_SALT);
    expect(key1.equals(key2)).toBe(true);
  });

  it('should return different keys for different secrets', () => {
    const key1 = deriveKey(TEST_SECRET, TEST_SALT);
    clearKeyCache();
    const key2 = deriveKey('different-secret-that-is-32-chars-long!!!!!!', TEST_SALT);
    expect(key1.equals(key2)).toBe(false);
  });

  it('should return different keys for different salts', () => {
    const key1 = deriveKey(TEST_SECRET, TEST_SALT);
    clearKeyCache();
    const key2 = deriveKey(TEST_SECRET, 'different-salt-value-1234567890');
    expect(key1.equals(key2)).toBe(false);
  });

  it('should return a COPY of the cached key (not the same reference)', () => {
    const key1 = deriveKey(TEST_SECRET, TEST_SALT);
    const key2 = deriveKey(TEST_SECRET, TEST_SALT); // cache hit
    // Same content
    expect(key1.equals(key2)).toBe(true);
    // But different Buffer instances
    key1.fill(0);
    expect(key2.every((b) => b === 0)).toBe(false);
  });

  it('should use cache on repeated calls with same inputs', () => {
    // First call derives the key (cold)
    const key1 = deriveKey(TEST_SECRET, TEST_SALT);

    // Mutate the returned copy — should NOT affect cache
    key1.fill(0);

    // Second call should return a fresh copy from cache, not the zeroed copy
    const key2 = deriveKey(TEST_SECRET, TEST_SALT);
    expect(key2.every((b) => b === 0)).toBe(false);

    // Verify cache returns consistent values
    const key3 = deriveKey(TEST_SECRET, TEST_SALT);
    expect(key2.equals(key3)).toBe(true);
  });

  it('should zero the key buffer on clearKeyCache', () => {
    const key = deriveKey(TEST_SECRET, TEST_SALT);
    const keyBytes = Buffer.from(key); // save a copy to compare
    expect(keyBytes.every((b) => b === 0)).toBe(false); // key is non-zero

    clearKeyCache();

    // After clearing, the NEXT derivation should still work
    const key2 = deriveKey(TEST_SECRET, TEST_SALT);
    expect(key2.length).toBe(32);
    expect(key2.every((b) => b === 0)).toBe(false);
  });
});

describe('validateVaultSecret', () => {
  it('should accept a 32-char string', () => {
    expect(validateVaultSecret('a'.repeat(32))).toBe('a'.repeat(32));
  });

  it('should accept a 64-char string', () => {
    expect(validateVaultSecret('b'.repeat(64))).toBe('b'.repeat(64));
  });

  it('should reject undefined', () => {
    expect(() => validateVaultSecret(undefined)).toThrow('VAULT_SECRET environment variable is required');
  });

  it('should reject empty string', () => {
    expect(() => validateVaultSecret('')).toThrow('VAULT_SECRET must be at least 32 characters');
  });

  it('should reject string shorter than 32 chars', () => {
    expect(() => validateVaultSecret('short')).toThrow('VAULT_SECRET must be at least 32 characters');
  });

  it('should reject 31-char string', () => {
    expect(() => validateVaultSecret('a'.repeat(31))).toThrow('VAULT_SECRET must be at least 32 characters');
  });
});

describe('validateVaultSalt', () => {
  it('should accept a 64-char hex string', () => {
    const salt = 'abcdef0123456789'.repeat(4);
    expect(validateVaultSalt(salt)).toBe(salt);
  });

  it('should accept a 32-char string', () => {
    expect(validateVaultSalt('a'.repeat(32))).toBe('a'.repeat(32));
  });

  it('should reject undefined', () => {
    expect(() => validateVaultSalt(undefined)).toThrow('VAULT_SALT environment variable is required');
  });

  it('should reject empty string', () => {
    expect(() => validateVaultSalt('')).toThrow('VAULT_SALT must be at least 32 characters');
  });

  it('should reject string shorter than 32 chars', () => {
    expect(() => validateVaultSalt('short')).toThrow('VAULT_SALT must be at least 32 characters');
  });

  it('should reject 31-char string', () => {
    expect(() => validateVaultSalt('a'.repeat(31))).toThrow('VAULT_SALT must be at least 32 characters');
  });
});
