import { randomBytes, createHash } from 'node:crypto';

const CODE_VERIFIER_LENGTH = 64;

export interface PkceChallenge {
  readonly codeVerifier: string;
  readonly codeChallenge: string;
  readonly codeChallengeMethod: 'S256';
}

export function generatePkceChallenge(): PkceChallenge {
  const codeVerifier = randomBytes(CODE_VERIFIER_LENGTH)
    .toString('base64url')
    .slice(0, 128);

  const codeChallenge = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  return Object.freeze({
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256' as const,
  });
}

export function generateState(): string {
  return randomBytes(32).toString('base64url');
}
