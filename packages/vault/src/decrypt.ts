import { createDecipheriv } from 'node:crypto';

import { IV_LENGTH, AUTH_TAG_LENGTH, ALGORITHM, CIPHERTEXT_VERSION } from './constants.js';
import { deriveKey } from './derive-key.js';

export function decrypt(ciphertext: string, secret: string, salt: string): string {
  const combined = Buffer.from(ciphertext, 'base64');

  // Minimum: version(1) + iv(12) + authTag(16) = 29. Empty plaintext is valid (0-byte encrypted segment).
  if (combined.length < 1 + IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Decryption failed');
  }

  const version = combined[0];
  if (version !== CIPHERTEXT_VERSION) {
    throw new Error('Decryption failed');
  }

  const iv = combined.subarray(1, 1 + IV_LENGTH);
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(1 + IV_LENGTH, combined.length - AUTH_TAG_LENGTH);

  const key = deriveKey(secret, salt);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    throw new Error('Decryption failed');
  }
}
