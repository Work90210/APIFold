import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildAuthHeaders } from '../../src/mcp/auth-injector.js';
import type { CredentialCache } from '../../src/registry/credential-cache.js';

describe('buildAuthHeaders', () => {
  let credentialCache: { getHeaders: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    credentialCache = {
      getHeaders: vi.fn().mockResolvedValue({ Authorization: 'Bearer test-token' }),
    };
  });

  it('returns empty headers for authMode "none"', async () => {
    const headers = await buildAuthHeaders(
      { credentialCache: credentialCache as unknown as CredentialCache },
      'srv-1',
      'none',
    );
    expect(headers).toEqual({});
    expect(credentialCache.getHeaders).not.toHaveBeenCalled();
  });

  it('returns cached headers for authMode "bearer"', async () => {
    const headers = await buildAuthHeaders(
      { credentialCache: credentialCache as unknown as CredentialCache },
      'srv-1',
      'bearer',
    );
    expect(headers).toEqual({ Authorization: 'Bearer test-token' });
    expect(credentialCache.getHeaders).toHaveBeenCalledWith('srv-1');
  });

  it('returns cached headers for authMode "api_key"', async () => {
    credentialCache.getHeaders.mockResolvedValue({ 'X-API-Key': 'my-key' });
    const headers = await buildAuthHeaders(
      { credentialCache: credentialCache as unknown as CredentialCache },
      'srv-1',
      'api_key',
    );
    expect(headers).toEqual({ 'X-API-Key': 'my-key' });
  });

  it('delegates unknown authMode to credential cache (validated upstream)', async () => {
    // Unknown authModes are rejected by validateAuthMode in postgres-loader
    // before reaching auth-injector. If one somehow arrives, it delegates
    // to the credential cache which will return whatever the DB has.
    credentialCache.getHeaders.mockResolvedValue({});
    const headers = await buildAuthHeaders(
      { credentialCache: credentialCache as unknown as CredentialCache },
      'srv-1',
      'oauth2' as never,
    );
    expect(headers).toEqual({});
    expect(credentialCache.getHeaders).toHaveBeenCalledWith('srv-1');
  });
});
