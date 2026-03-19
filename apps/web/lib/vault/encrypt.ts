import { randomBytes, createCipheriv } from 'node:crypto';

import { IV_LENGTH, AUTH_TAG_LENGTH, ALGORITHM, CIPHERTEXT_VERSION } from './constants.js';
import { deriveKey } from './derive-key.js';

export function encrypt(plaintext: string, secret: string, salt: string): string {
  const key = deriveKey(secret, salt);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error('Unexpected auth tag length');
  }

  const combined = Buffer.concat([Buffer.from([CIPHERTEXT_VERSION]), iv, encrypted, authTag]);
  return combined.toString('base64');
}
