import { describe, it, expect } from 'vitest';
import {
  createCredentialSchema,
  updateCredentialSchema,
} from '../../lib/validation/credential.schema.js';

const VALID_BASE = {
  label: 'My API Key',
  plaintextKey: 'sk-12345',
  authType: 'api_key' as const,
};

describe('createCredentialSchema', () => {
  describe('happy path — accepted inputs', () => {
    it('accepts a valid api_key credential', () => {
      const result = createCredentialSchema.parse(VALID_BASE);
      expect(result.label).toBe('My API Key');
      expect(result.plaintextKey).toBe('sk-12345');
      expect(result.authType).toBe('api_key');
    });

    it('accepts a valid bearer credential', () => {
      const result = createCredentialSchema.parse({
        ...VALID_BASE,
        authType: 'bearer',
      });
      expect(result.authType).toBe('bearer');
    });

    it('accepts a valid oauth2_authcode credential with all OAuth fields', () => {
      const result = createCredentialSchema.parse({
        label: 'OAuth Cred',
        plaintextKey: 'access-token-value',
        authType: 'oauth2_authcode',
        refreshToken: 'refresh-token-value',
        scopes: ['read', 'write'],
        tokenEndpoint: 'https://oauth.example.com/token',
        clientId: 'client-id-123',
        clientSecret: 'client-secret-abc',
        provider: 'google',
        tokenExpiresAt: new Date('2030-01-01'),
      });
      expect(result.authType).toBe('oauth2_authcode');
      expect(result.refreshToken).toBe('refresh-token-value');
      expect(result.scopes).toEqual(['read', 'write']);
      expect(result.tokenEndpoint).toBe('https://oauth.example.com/token');
      expect(result.clientId).toBe('client-id-123');
      expect(result.clientSecret).toBe('client-secret-abc');
      expect(result.provider).toBe('google');
    });

    it('accepts a valid oauth2_client_creds credential', () => {
      const result = createCredentialSchema.parse({
        label: 'Client Creds',
        plaintextKey: 'access-token',
        authType: 'oauth2_client_creds',
        scopes: ['api'],
        tokenEndpoint: 'https://auth.example.com/token',
        clientId: 'client-id',
        clientSecret: 'secret',
      });
      expect(result.authType).toBe('oauth2_client_creds');
    });

    it('accepts oauth2_authcode with no optional fields', () => {
      const result = createCredentialSchema.parse({
        ...VALID_BASE,
        authType: 'oauth2_authcode',
      });
      expect(result.authType).toBe('oauth2_authcode');
      expect(result.refreshToken).toBeUndefined();
      expect(result.scopes).toBeUndefined();
      expect(result.tokenEndpoint).toBeUndefined();
    });

    it('accepts tokenEndpoint as a valid public HTTPS URL', () => {
      const result = createCredentialSchema.parse({
        ...VALID_BASE,
        tokenEndpoint: 'https://api.example.com/oauth/token',
      });
      expect(result.tokenEndpoint).toBe('https://api.example.com/oauth/token');
    });

    it('accepts scopes array up to 50 items', () => {
      const scopes = Array.from({ length: 50 }, (_, i) => `scope-${i}`);
      const result = createCredentialSchema.parse({ ...VALID_BASE, scopes });
      expect(result.scopes).toHaveLength(50);
    });
  });

  describe('label validation', () => {
    it('rejects empty label', () => {
      expect(() =>
        createCredentialSchema.parse({ ...VALID_BASE, label: '' }),
      ).toThrow();
    });

    it('rejects label that trims to empty string', () => {
      expect(() =>
        createCredentialSchema.parse({ ...VALID_BASE, label: '   ' }),
      ).toThrow();
    });

    it('rejects label exceeding 200 characters', () => {
      expect(() =>
        createCredentialSchema.parse({ ...VALID_BASE, label: 'a'.repeat(201) }),
      ).toThrow();
    });
  });

  describe('plaintextKey validation', () => {
    it('rejects empty plaintextKey', () => {
      expect(() =>
        createCredentialSchema.parse({ ...VALID_BASE, plaintextKey: '' }),
      ).toThrow();
    });

    it('rejects plaintextKey that trims to empty string', () => {
      expect(() =>
        createCredentialSchema.parse({ ...VALID_BASE, plaintextKey: '   ' }),
      ).toThrow();
    });
  });

  describe('authType validation', () => {
    it('rejects invalid authType', () => {
      expect(() =>
        createCredentialSchema.parse({ ...VALID_BASE, authType: 'invalid' }),
      ).toThrow();
    });

    it('rejects authType of "none"', () => {
      expect(() =>
        createCredentialSchema.parse({ ...VALID_BASE, authType: 'none' }),
      ).toThrow();
    });
  });

  describe('tokenEndpoint validation', () => {
    it('rejects http:// tokenEndpoint (must be HTTPS)', () => {
      expect(() =>
        createCredentialSchema.parse({
          ...VALID_BASE,
          tokenEndpoint: 'http://api.example.com/token',
        }),
      ).toThrow();
    });

    it('rejects localhost tokenEndpoint', () => {
      expect(() =>
        createCredentialSchema.parse({
          ...VALID_BASE,
          tokenEndpoint: 'https://localhost/token',
        }),
      ).toThrow();
    });

    it('rejects 127.0.0.1 tokenEndpoint', () => {
      expect(() =>
        createCredentialSchema.parse({
          ...VALID_BASE,
          tokenEndpoint: 'https://127.0.0.1/token',
        }),
      ).toThrow();
    });

    it('rejects 10.x.x.x private address tokenEndpoint', () => {
      expect(() =>
        createCredentialSchema.parse({
          ...VALID_BASE,
          tokenEndpoint: 'https://10.0.0.1/token',
        }),
      ).toThrow();
    });

    it('rejects 192.168.x.x private address tokenEndpoint', () => {
      expect(() =>
        createCredentialSchema.parse({
          ...VALID_BASE,
          tokenEndpoint: 'https://192.168.1.1/token',
        }),
      ).toThrow();
    });

    it('rejects 169.254.x.x link-local tokenEndpoint', () => {
      expect(() =>
        createCredentialSchema.parse({
          ...VALID_BASE,
          tokenEndpoint: 'https://169.254.169.254/token',
        }),
      ).toThrow();
    });

    it('rejects a completely non-URL string for tokenEndpoint', () => {
      expect(() =>
        createCredentialSchema.parse({
          ...VALID_BASE,
          tokenEndpoint: 'not-a-url',
        }),
      ).toThrow();
    });
  });

  describe('scopes validation', () => {
    it('rejects scopes array with more than 50 items', () => {
      const scopes = Array.from({ length: 51 }, (_, i) => `scope-${i}`);
      expect(() =>
        createCredentialSchema.parse({ ...VALID_BASE, scopes }),
      ).toThrow();
    });

    it('accepts an empty scopes array', () => {
      const result = createCredentialSchema.parse({ ...VALID_BASE, scopes: [] });
      expect(result.scopes).toEqual([]);
    });
  });
});

describe('updateCredentialSchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    const result = updateCredentialSchema.parse({});
    expect(result).toEqual({});
  });

  it('accepts null refreshToken for revocation', () => {
    const result = updateCredentialSchema.parse({ refreshToken: null });
    expect(result.refreshToken).toBeNull();
  });

  it('accepts null clientSecret for revocation', () => {
    const result = updateCredentialSchema.parse({ clientSecret: null });
    expect(result.clientSecret).toBeNull();
  });

  it('accepts null tokenEndpoint', () => {
    const result = updateCredentialSchema.parse({ tokenEndpoint: null });
    expect(result.tokenEndpoint).toBeNull();
  });

  it('accepts null clientId', () => {
    const result = updateCredentialSchema.parse({ clientId: null });
    expect(result.clientId).toBeNull();
  });

  it('accepts null provider', () => {
    const result = updateCredentialSchema.parse({ provider: null });
    expect(result.provider).toBeNull();
  });

  it('accepts a valid partial update (label only)', () => {
    const result = updateCredentialSchema.parse({ label: 'Updated Label' });
    expect(result.label).toBe('Updated Label');
  });

  it('accepts all four authType values', () => {
    for (const authType of [
      'api_key',
      'bearer',
      'oauth2_authcode',
      'oauth2_client_creds',
    ] as const) {
      const result = updateCredentialSchema.parse({ authType });
      expect(result.authType).toBe(authType);
    }
  });

  it('rejects empty string label on update', () => {
    expect(() =>
      updateCredentialSchema.parse({ label: '' }),
    ).toThrow();
  });

  it('rejects invalid authType on update', () => {
    expect(() =>
      updateCredentialSchema.parse({ authType: 'invalid' }),
    ).toThrow();
  });

  it('still rejects http:// tokenEndpoint on update', () => {
    expect(() =>
      updateCredentialSchema.parse({
        tokenEndpoint: 'http://api.example.com/token',
      }),
    ).toThrow();
  });

  it('still rejects private-address tokenEndpoint on update', () => {
    expect(() =>
      updateCredentialSchema.parse({
        tokenEndpoint: 'https://10.1.2.3/token',
      }),
    ).toThrow();
  });
});
