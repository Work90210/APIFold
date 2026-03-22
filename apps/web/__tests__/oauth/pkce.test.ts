import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { generatePkceChallenge, generateState } from '../../lib/oauth/pkce';

describe('generatePkceChallenge', () => {
  it('returns codeVerifier and codeChallenge', () => {
    const result = generatePkceChallenge();

    expect(result).toHaveProperty('codeVerifier');
    expect(result).toHaveProperty('codeChallenge');
    expect(result).toHaveProperty('codeChallengeMethod', 'S256');
    expect(typeof result.codeVerifier).toBe('string');
    expect(typeof result.codeChallenge).toBe('string');
  });

  it('codeVerifier is a non-empty string', () => {
    const { codeVerifier } = generatePkceChallenge();

    expect(codeVerifier.length).toBeGreaterThan(0);
  });

  it('codeChallenge is the SHA-256 base64url hash of the codeVerifier', () => {
    const { codeVerifier, codeChallenge } = generatePkceChallenge();

    const expected = createHash('sha256').update(codeVerifier).digest('base64url');

    expect(codeChallenge).toBe(expected);
  });

  it('codeChallengeMethod is always "S256"', () => {
    const result = generatePkceChallenge();

    expect(result.codeChallengeMethod).toBe('S256');
  });

  it('returns a frozen (immutable) object', () => {
    const result = generatePkceChallenge();

    expect(Object.isFrozen(result)).toBe(true);
  });

  it('each call produces unique codeVerifier values', () => {
    const a = generatePkceChallenge();
    const b = generatePkceChallenge();
    const c = generatePkceChallenge();

    expect(a.codeVerifier).not.toBe(b.codeVerifier);
    expect(b.codeVerifier).not.toBe(c.codeVerifier);
    expect(a.codeVerifier).not.toBe(c.codeVerifier);
  });

  it('each call produces unique codeChallenge values', () => {
    const a = generatePkceChallenge();
    const b = generatePkceChallenge();

    expect(a.codeChallenge).not.toBe(b.codeChallenge);
  });

  it('codeVerifier length does not exceed 128 characters (RFC 7636 max)', () => {
    for (let i = 0; i < 10; i++) {
      const { codeVerifier } = generatePkceChallenge();
      expect(codeVerifier.length).toBeLessThanOrEqual(128);
    }
  });
});

describe('generateState', () => {
  it('returns a non-empty string', () => {
    const state = generateState();

    expect(typeof state).toBe('string');
    expect(state.length).toBeGreaterThan(0);
  });

  it('each call produces unique state values', () => {
    const states = Array.from({ length: 10 }, () => generateState());
    const unique = new Set(states);

    expect(unique.size).toBe(10);
  });

  it('state is base64url-safe (no +, /, or = characters)', () => {
    for (let i = 0; i < 20; i++) {
      const state = generateState();
      expect(state).toMatch(/^[A-Za-z0-9\-_]+$/);
    }
  });

  it('state is sufficiently long (at least 32 characters) for CSRF protection', () => {
    for (let i = 0; i < 10; i++) {
      const state = generateState();
      expect(state.length).toBeGreaterThanOrEqual(32);
    }
  });
});
