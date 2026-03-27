export const PBKDF2_ITERATIONS = 600_000;

if (PBKDF2_ITERATIONS < 600_000) {
  throw new Error('PBKDF2_ITERATIONS must be >= 600,000 per NIST SP 800-132');
}

export const KEY_LENGTH = 32;
export const PBKDF2_DIGEST = 'sha256';
export const IV_LENGTH = 12;
export const AUTH_TAG_LENGTH = 16;
export const ALGORITHM = 'aes-256-gcm';
export const CIPHERTEXT_VERSION = 0x01;
