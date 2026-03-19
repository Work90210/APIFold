export { encrypt } from './encrypt.js';
export { decrypt } from './decrypt.js';
export { validateVaultSecret, validateVaultSalt } from './validate.js';
export {
  PBKDF2_ITERATIONS,
  KEY_LENGTH,
  PBKDF2_DIGEST,
  IV_LENGTH,
  AUTH_TAG_LENGTH,
  ALGORITHM,
  CIPHERTEXT_VERSION,
} from './constants.js';

// Internal — exported for app-level shutdown cleanup only.
// Do NOT use deriveKey directly; use encrypt/decrypt instead.
export { deriveKey as _deriveKeyInternal, clearKeyCache } from './derive-key.js';
