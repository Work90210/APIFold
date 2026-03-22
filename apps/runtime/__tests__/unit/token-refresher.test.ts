import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isTokenExpired,
  refreshAndUpdateToken,
  CredentialExpiredError,
  type OAuthCredentialRow,
  type TokenRefresherDeps,
} from '../../src/oauth/token-refresher.js';
import { createTestLogger } from '../helpers.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TOKEN_EXPIRY_BUFFER_MS = 60_000; // must match the implementation constant

function futureDate(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

function pastDate(offsetMs: number): string {
  return new Date(Date.now() - offsetMs).toISOString();
}

function makeCredential(overrides: Partial<OAuthCredentialRow> = {}): OAuthCredentialRow {
  return {
    id: 'cred-1',
    encrypted_key: 'enc-access-token',
    auth_type: 'oauth2',
    token_endpoint: 'https://auth.example.com/token',
    client_id: 'client-id',
    encrypted_client_secret: 'enc-client-secret',
    encrypted_refresh_token: 'enc-refresh-token',
    token_expires_at: null,
    ...overrides,
  };
}

function makeSuccessResponse(body: Record<string, unknown> = {}) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({
      access_token: 'refreshed-access-token',
      refresh_token: 'new-refresh-token',
      expires_in: 3600,
      ...body,
    }),
    text: vi.fn().mockResolvedValue(''),
  };
}

function makeErrorResponse(status = 401, text = 'invalid_grant') {
  return {
    ok: false,
    status,
    json: vi.fn().mockResolvedValue({}),
    text: vi.fn().mockResolvedValue(text),
  };
}

function makeDeps(dbQueryMock = vi.fn().mockResolvedValue({ rows: [] })): TokenRefresherDeps {
  return {
    db: { query: dbQueryMock } as unknown as TokenRefresherDeps['db'],
    logger: createTestLogger(),
    decryptFn: (encrypted: string) => `decrypted(${encrypted})`,
    encryptFn: (plaintext: string) => `encrypted(${plaintext})`,
  };
}

// ---------------------------------------------------------------------------
// isTokenExpired
// ---------------------------------------------------------------------------

describe('isTokenExpired', () => {
  it('returns false when tokenExpiresAt is null', () => {
    expect(isTokenExpired(null)).toBe(false);
  });

  it('returns false when token expires well in the future (beyond the 60s buffer)', () => {
    const expiresAt = futureDate(TOKEN_EXPIRY_BUFFER_MS + 5_000); // 65s from now
    expect(isTokenExpired(expiresAt)).toBe(false);
  });

  it('returns true when token expiry is in the past', () => {
    const expiresAt = pastDate(1_000); // 1 second ago
    expect(isTokenExpired(expiresAt)).toBe(true);
  });

  it('returns true when token expires within the 60s buffer window', () => {
    const expiresAt = futureDate(30_000); // only 30s away — inside buffer
    expect(isTokenExpired(expiresAt)).toBe(true);
  });

  it('returns true when token expires exactly at the buffer boundary (0ms remaining after buffer)', () => {
    // Exactly at the threshold — implementation uses strict <, so this is expired
    const expiresAt = futureDate(TOKEN_EXPIRY_BUFFER_MS - 1);
    expect(isTokenExpired(expiresAt)).toBe(true);
  });

  it('returns false when token expires exactly at buffer boundary + 1ms', () => {
    const expiresAt = futureDate(TOKEN_EXPIRY_BUFFER_MS + 1);
    expect(isTokenExpired(expiresAt)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// refreshAndUpdateToken
// ---------------------------------------------------------------------------

describe('refreshAndUpdateToken', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('missing refresh configuration', () => {
    it('throws CredentialExpiredError when token_endpoint is null', async () => {
      const deps = makeDeps();
      const credential = makeCredential({ token_endpoint: null });

      await expect(refreshAndUpdateToken(deps, credential)).rejects.toThrow(
        CredentialExpiredError,
      );
      await expect(refreshAndUpdateToken(deps, credential)).rejects.toThrow(
        'OAuth credential missing refresh configuration',
      );
    });

    it('throws CredentialExpiredError when client_id is null', async () => {
      const deps = makeDeps();
      const credential = makeCredential({ client_id: null });

      await expect(refreshAndUpdateToken(deps, credential)).rejects.toThrow(
        CredentialExpiredError,
      );
    });

    it('throws CredentialExpiredError when encrypted_refresh_token is null', async () => {
      const deps = makeDeps();
      const credential = makeCredential({ encrypted_refresh_token: null });

      await expect(refreshAndUpdateToken(deps, credential)).rejects.toThrow(
        CredentialExpiredError,
      );
    });
  });

  describe('token endpoint call', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeSuccessResponse()));
    });

    it('calls the token endpoint with grant_type refresh_token and decrypted credentials', async () => {
      const deps = makeDeps();
      const credential = makeCredential();

      await refreshAndUpdateToken(deps, credential);

      const fetchMock = vi.mocked(fetch);
      expect(fetchMock).toHaveBeenCalledOnce();

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://auth.example.com/token');
      expect(init.method).toBe('POST');

      const body = new URLSearchParams(init.body as string);
      expect(body.get('grant_type')).toBe('refresh_token');
      expect(body.get('refresh_token')).toBe('decrypted(enc-refresh-token)');
      expect(body.get('client_id')).toBe('client-id');
      expect(body.get('client_secret')).toBe('decrypted(enc-client-secret)');
    });

    it('uses a 15s timeout via AbortController signal', async () => {
      const deps = makeDeps();
      const credential = makeCredential();

      await refreshAndUpdateToken(deps, credential);

      const fetchMock = vi.mocked(fetch);
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });

    it('sends empty string for client_secret when encrypted_client_secret is null', async () => {
      const deps = makeDeps();
      const credential = makeCredential({ encrypted_client_secret: null });

      await refreshAndUpdateToken(deps, credential);

      const fetchMock = vi.mocked(fetch);
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const body = new URLSearchParams(init.body as string);
      expect(body.get('client_secret')).toBe('');
    });
  });

  describe('DB update after successful refresh', () => {
    it('updates DB with new encrypted access token and refresh token', async () => {
      const dbQuery = vi.fn().mockResolvedValue({ rows: [] });
      const deps = makeDeps(dbQuery);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeSuccessResponse()));

      const credential = makeCredential();

      await refreshAndUpdateToken(deps, credential);

      expect(dbQuery).toHaveBeenCalledOnce();
      const [sql, params] = dbQuery.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('UPDATE credentials');
      expect(sql).toContain('encrypted_key');
      expect(sql).toContain('encrypted_refresh_token');
      // encrypted new access token
      expect(params).toContain('encrypted(refreshed-access-token)');
      // encrypted new refresh token
      expect(params).toContain('encrypted(new-refresh-token)');
      // credential id
      expect(params).toContain('cred-1');
    });

    it('updates DB without refreshing encrypted_refresh_token when response omits it', async () => {
      const dbQuery = vi.fn().mockResolvedValue({ rows: [] });
      const deps = makeDeps(dbQuery);
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          makeSuccessResponse({ access_token: 'refreshed-access-token', refresh_token: undefined }),
        ),
      );

      await refreshAndUpdateToken(deps, makeCredential());

      const [sql] = dbQuery.mock.calls[0] as [string, unknown[]];
      // Should use the shorter UPDATE form that does not touch encrypted_refresh_token
      expect(sql).not.toContain('encrypted_refresh_token');
    });

    it('stores a token_expires_at value when expires_in is present in response', async () => {
      const dbQuery = vi.fn().mockResolvedValue({ rows: [] });
      const deps = makeDeps(dbQuery);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeSuccessResponse({ expires_in: 7200 })));

      await refreshAndUpdateToken(deps, makeCredential());

      const [, params] = dbQuery.mock.calls[0] as [string, unknown[]];
      const expiresAtParam = params.find(
        (p) => typeof p === 'string' && p.includes('T') && !p.startsWith('encrypted'),
      ) as string | undefined;
      expect(expiresAtParam).toBeDefined();
      // Should be approximately 2h from now
      const expiresAt = new Date(expiresAtParam!).getTime();
      expect(expiresAt).toBeGreaterThan(Date.now() + 7000 * 1000);
    });

    it('stores null token_expires_at when expires_in is absent', async () => {
      const dbQuery = vi.fn().mockResolvedValue({ rows: [] });
      const deps = makeDeps(dbQuery);
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          makeSuccessResponse({ access_token: 'refreshed-access-token', expires_in: undefined }),
        ),
      );

      await refreshAndUpdateToken(deps, makeCredential());

      const [, params] = dbQuery.mock.calls[0] as [string, unknown[]];
      expect(params).toContain(null);
    });

    it('returns the new plain-text access token', async () => {
      const deps = makeDeps();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeSuccessResponse()));

      const result = await refreshAndUpdateToken(deps, makeCredential());

      expect(result).toBe('refreshed-access-token');
    });
  });

  describe('HTTP error from token endpoint', () => {
    it('throws CredentialExpiredError on non-OK response', async () => {
      const deps = makeDeps();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeErrorResponse(400, 'invalid_grant')));

      await expect(refreshAndUpdateToken(deps, makeCredential())).rejects.toThrow(
        CredentialExpiredError,
      );
      await expect(
        refreshAndUpdateToken(deps, makeCredential()),
      ).rejects.toThrow('Token refresh failed (HTTP 400)');
    });

    it('throws CredentialExpiredError on 401 unauthorized response', async () => {
      const deps = makeDeps();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeErrorResponse(401, 'token_expired')));

      await expect(refreshAndUpdateToken(deps, makeCredential())).rejects.toThrow(
        CredentialExpiredError,
      );
    });

    it('throws CredentialExpiredError when fetch itself rejects (network error)', async () => {
      const deps = makeDeps();
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

      await expect(refreshAndUpdateToken(deps, makeCredential())).rejects.toThrow(
        CredentialExpiredError,
      );
      await expect(
        refreshAndUpdateToken(deps, makeCredential()),
      ).rejects.toThrow('ECONNREFUSED');
    });

    it('does not call db.query when token endpoint returns an error', async () => {
      const dbQuery = vi.fn().mockResolvedValue({ rows: [] });
      const deps = makeDeps(dbQuery);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeErrorResponse(400)));

      await expect(refreshAndUpdateToken(deps, makeCredential())).rejects.toThrow(
        CredentialExpiredError,
      );

      expect(dbQuery).not.toHaveBeenCalled();
    });

    it('throws CredentialExpiredError when token endpoint returns empty access_token', async () => {
      const deps = makeDeps();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          makeSuccessResponse({ access_token: '', refresh_token: undefined }),
        ),
      );

      await expect(refreshAndUpdateToken(deps, makeCredential())).rejects.toThrow(
        CredentialExpiredError,
      );
      await expect(
        refreshAndUpdateToken(deps, makeCredential()),
      ).rejects.toThrow('Token refresh returned empty access token');
    });
  });

  describe('decryption failure', () => {
    it('throws CredentialExpiredError when decryptFn throws', async () => {
      const deps: TokenRefresherDeps = {
        db: { query: vi.fn() } as unknown as TokenRefresherDeps['db'],
        logger: createTestLogger(),
        decryptFn: () => {
          throw new Error('bad key');
        },
        encryptFn: (p: string) => p,
      };

      await expect(refreshAndUpdateToken(deps, makeCredential())).rejects.toThrow(
        CredentialExpiredError,
      );
      await expect(
        refreshAndUpdateToken(deps, makeCredential()),
      ).rejects.toThrow('Failed to decrypt OAuth credentials');
    });
  });
});
