import { describe, it, expect } from 'vitest';
import {
  createServerSchema,
  updateServerSchema,
} from '../../lib/validation/server.schema.js';

const VALID_CREATE_BASE = {
  specId: '550e8400-e29b-41d4-a716-446655440000',
  name: 'My Server',
  slug: 'my-server',
  baseUrl: 'https://api.example.com',
};

describe('createServerSchema — OAuth authMode values', () => {
  it('accepts oauth2_authcode as authMode', () => {
    const result = createServerSchema.parse({
      ...VALID_CREATE_BASE,
      authMode: 'oauth2_authcode',
    });
    expect(result.authMode).toBe('oauth2_authcode');
  });

  it('accepts oauth2_client_creds as authMode', () => {
    const result = createServerSchema.parse({
      ...VALID_CREATE_BASE,
      authMode: 'oauth2_client_creds',
    });
    expect(result.authMode).toBe('oauth2_client_creds');
  });

  it('accepts all five supported authMode values', () => {
    const modes = [
      'none',
      'api_key',
      'bearer',
      'oauth2_authcode',
      'oauth2_client_creds',
    ] as const;

    for (const authMode of modes) {
      const result = createServerSchema.parse({
        ...VALID_CREATE_BASE,
        authMode,
      });
      expect(result.authMode).toBe(authMode);
    }
  });

  it('rejects an unknown authMode', () => {
    expect(() =>
      createServerSchema.parse({
        ...VALID_CREATE_BASE,
        authMode: 'oauth2_pkce',
      }),
    ).toThrow();
  });

  it('defaults rateLimitPerMinute to 100', () => {
    const result = createServerSchema.parse({
      ...VALID_CREATE_BASE,
      authMode: 'oauth2_authcode',
    });
    expect(result.rateLimitPerMinute).toBe(100);
  });
});

describe('updateServerSchema — OAuth authMode values', () => {
  it('accepts oauth2_authcode as authMode on update', () => {
    const result = updateServerSchema.parse({ authMode: 'oauth2_authcode' });
    expect(result.authMode).toBe('oauth2_authcode');
  });

  it('accepts oauth2_client_creds as authMode on update', () => {
    const result = updateServerSchema.parse({ authMode: 'oauth2_client_creds' });
    expect(result.authMode).toBe('oauth2_client_creds');
  });

  it('accepts all five supported authMode values on update', () => {
    const modes = [
      'none',
      'api_key',
      'bearer',
      'oauth2_authcode',
      'oauth2_client_creds',
    ] as const;

    for (const authMode of modes) {
      const result = updateServerSchema.parse({ authMode });
      expect(result.authMode).toBe(authMode);
    }
  });

  it('accepts an empty object (all fields optional)', () => {
    const result = updateServerSchema.parse({});
    expect(result).toEqual({});
  });

  it('rejects an unknown authMode on update', () => {
    expect(() =>
      updateServerSchema.parse({ authMode: 'oauth2_pkce' }),
    ).toThrow();
  });

  it('accepts isActive toggle alongside oauth authMode', () => {
    const result = updateServerSchema.parse({
      authMode: 'oauth2_client_creds',
      isActive: false,
    });
    expect(result.authMode).toBe('oauth2_client_creds');
    expect(result.isActive).toBe(false);
  });
});
