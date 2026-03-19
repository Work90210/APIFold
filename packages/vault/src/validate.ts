const MIN_SECRET_LENGTH = 32;
const MIN_SALT_LENGTH = 32;

export function validateVaultSecret(secret: string | undefined | null): string {
  if (secret === undefined || secret === null) {
    throw new Error(
      'VAULT_SECRET environment variable is required. ' +
        `It must be at least ${MIN_SECRET_LENGTH} characters.`,
    );
  }

  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `VAULT_SECRET must be at least ${MIN_SECRET_LENGTH} characters.`,
    );
  }

  return secret;
}

export function validateVaultSalt(salt: string | undefined | null): string {
  if (salt === undefined || salt === null) {
    throw new Error(
      'VAULT_SALT environment variable is required. ' +
        'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }

  if (salt.length < MIN_SALT_LENGTH) {
    throw new Error(
      `VAULT_SALT must be at least ${MIN_SALT_LENGTH} characters.`,
    );
  }

  return salt;
}
