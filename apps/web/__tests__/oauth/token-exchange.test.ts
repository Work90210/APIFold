import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  exchangeAuthorizationCode,
  exchangeClientCredentials,
  refreshAccessToken,
} from '../../lib/oauth/token-exchange';

const TOKEN_ENDPOINT = 'https://auth.example.com/oauth/token';

const MOCK_TOKEN_RESPONSE = {
  access_token: 'new-access-token',
  refresh_token: 'new-refresh-token',
  expires_in: 3600,
  scope: 'read write',
  token_type: 'Bearer',
};

function makeFetchMock(options: {
  ok?: boolean;
  status?: number;
  json?: Record<string, unknown>;
  text?: string;
}) {
  const { ok = true, status = 200, json = MOCK_TOKEN_RESPONSE, text = '' } = options;
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: vi.fn().mockResolvedValue(json),
    text: vi.fn().mockResolvedValue(text),
  });
}

describe('exchangeAuthorizationCode', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', makeFetchMock({}));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the correct grant_type, code, redirect_uri, code_verifier, client_id, client_secret', async () => {
    await exchangeAuthorizationCode({
      tokenEndpoint: TOKEN_ENDPOINT,
      code: 'auth-code-123',
      codeVerifier: 'verifier-abc',
      redirectUri: 'https://app.example.com/callback',
      clientId: 'client-id-xyz',
      clientSecret: 'client-secret-xyz',
    });

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(TOKEN_ENDPOINT);
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    const body = new URLSearchParams(init.body as string);
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('auth-code-123');
    expect(body.get('redirect_uri')).toBe('https://app.example.com/callback');
    expect(body.get('code_verifier')).toBe('verifier-abc');
    expect(body.get('client_id')).toBe('client-id-xyz');
    expect(body.get('client_secret')).toBe('client-secret-xyz');
  });

  it('parses access_token, refresh_token, expires_in, scope, token_type from response', async () => {
    const result = await exchangeAuthorizationCode({
      tokenEndpoint: TOKEN_ENDPOINT,
      code: 'auth-code-123',
      codeVerifier: 'verifier-abc',
      redirectUri: 'https://app.example.com/callback',
      clientId: 'client-id-xyz',
      clientSecret: 'client-secret-xyz',
    });

    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toBe('new-refresh-token');
    expect(result.expiresIn).toBe(3600);
    expect(result.scope).toBe('read write');
    expect(result.tokenType).toBe('Bearer');
  });

  it('returns null for optional fields absent in response', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchMock({ json: { access_token: 'tok', token_type: 'Bearer' } }),
    );

    const result = await exchangeAuthorizationCode({
      tokenEndpoint: TOKEN_ENDPOINT,
      code: 'c',
      codeVerifier: 'v',
      redirectUri: 'https://example.com/cb',
      clientId: 'id',
      clientSecret: 'secret',
    });

    expect(result.refreshToken).toBeNull();
    expect(result.expiresIn).toBeNull();
    expect(result.scope).toBeNull();
  });

  it('throws on non-OK response', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchMock({ ok: false, status: 400, text: 'invalid_grant' }),
    );

    await expect(
      exchangeAuthorizationCode({
        tokenEndpoint: TOKEN_ENDPOINT,
        code: 'bad-code',
        codeVerifier: 'v',
        redirectUri: 'https://example.com/cb',
        clientId: 'id',
        clientSecret: 'secret',
      }),
    ).rejects.toThrow('Token exchange failed (HTTP 400)');
  });

  it('uses a 15s timeout via AbortController signal', async () => {
    vi.stubGlobal('fetch', makeFetchMock({}));

    await exchangeAuthorizationCode({
      tokenEndpoint: TOKEN_ENDPOINT,
      code: 'c',
      codeVerifier: 'v',
      redirectUri: 'https://example.com/cb',
      clientId: 'id',
      clientSecret: 'secret',
    });

    const fetchMock = vi.mocked(fetch);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});

describe('exchangeClientCredentials', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', makeFetchMock({}));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the correct grant_type, client_id, client_secret, scope', async () => {
    await exchangeClientCredentials({
      tokenEndpoint: TOKEN_ENDPOINT,
      clientId: 'client-id-xyz',
      clientSecret: 'client-secret-xyz',
      scopes: ['read', 'write'],
      scopeSeparator: ' ',
    });

    const fetchMock = vi.mocked(fetch);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(TOKEN_ENDPOINT);

    const body = new URLSearchParams(init.body as string);
    expect(body.get('grant_type')).toBe('client_credentials');
    expect(body.get('client_id')).toBe('client-id-xyz');
    expect(body.get('client_secret')).toBe('client-secret-xyz');
    expect(body.get('scope')).toBe('read write');
  });

  it('omits scope field when scopes array is empty', async () => {
    await exchangeClientCredentials({
      tokenEndpoint: TOKEN_ENDPOINT,
      clientId: 'id',
      clientSecret: 'secret',
      scopes: [],
      scopeSeparator: ' ',
    });

    const fetchMock = vi.mocked(fetch);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = new URLSearchParams(init.body as string);
    expect(body.has('scope')).toBe(false);
  });

  it('joins scopes with the provided separator', async () => {
    await exchangeClientCredentials({
      tokenEndpoint: TOKEN_ENDPOINT,
      clientId: 'id',
      clientSecret: 'secret',
      scopes: ['read', 'write', 'admin'],
      scopeSeparator: ',',
    });

    const fetchMock = vi.mocked(fetch);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = new URLSearchParams(init.body as string);
    expect(body.get('scope')).toBe('read,write,admin');
  });

  it('parses access_token, refresh_token, expires_in, scope, token_type from response', async () => {
    const result = await exchangeClientCredentials({
      tokenEndpoint: TOKEN_ENDPOINT,
      clientId: 'id',
      clientSecret: 'secret',
      scopes: ['read'],
      scopeSeparator: ' ',
    });

    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toBe('new-refresh-token');
    expect(result.expiresIn).toBe(3600);
    expect(result.scope).toBe('read write');
    expect(result.tokenType).toBe('Bearer');
  });

  it('throws on non-OK response', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchMock({ ok: false, status: 401, text: 'unauthorized_client' }),
    );

    await expect(
      exchangeClientCredentials({
        tokenEndpoint: TOKEN_ENDPOINT,
        clientId: 'id',
        clientSecret: 'wrong-secret',
        scopes: [],
        scopeSeparator: ' ',
      }),
    ).rejects.toThrow('Token exchange failed (HTTP 401)');
  });

  it('uses a 15s timeout via AbortController signal', async () => {
    await exchangeClientCredentials({
      tokenEndpoint: TOKEN_ENDPOINT,
      clientId: 'id',
      clientSecret: 'secret',
      scopes: [],
      scopeSeparator: ' ',
    });

    const fetchMock = vi.mocked(fetch);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});

describe('refreshAccessToken', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', makeFetchMock({}));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the correct grant_type, refresh_token, client_id, client_secret', async () => {
    await refreshAccessToken({
      tokenEndpoint: TOKEN_ENDPOINT,
      refreshToken: 'old-refresh-token',
      clientId: 'client-id-xyz',
      clientSecret: 'client-secret-xyz',
    });

    const fetchMock = vi.mocked(fetch);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(TOKEN_ENDPOINT);

    const body = new URLSearchParams(init.body as string);
    expect(body.get('grant_type')).toBe('refresh_token');
    expect(body.get('refresh_token')).toBe('old-refresh-token');
    expect(body.get('client_id')).toBe('client-id-xyz');
    expect(body.get('client_secret')).toBe('client-secret-xyz');
  });

  it('parses access_token, refresh_token, expires_in, scope, token_type from response', async () => {
    const result = await refreshAccessToken({
      tokenEndpoint: TOKEN_ENDPOINT,
      refreshToken: 'old-refresh-token',
      clientId: 'id',
      clientSecret: 'secret',
    });

    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toBe('new-refresh-token');
    expect(result.expiresIn).toBe(3600);
    expect(result.scope).toBe('read write');
    expect(result.tokenType).toBe('Bearer');
  });

  it('throws on non-OK response', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchMock({ ok: false, status: 400, text: 'invalid_grant' }),
    );

    await expect(
      refreshAccessToken({
        tokenEndpoint: TOKEN_ENDPOINT,
        refreshToken: 'expired-token',
        clientId: 'id',
        clientSecret: 'secret',
      }),
    ).rejects.toThrow('Token exchange failed (HTTP 400)');
  });

  it('uses a 15s timeout via AbortController signal', async () => {
    await refreshAccessToken({
      tokenEndpoint: TOKEN_ENDPOINT,
      refreshToken: 'tok',
      clientId: 'id',
      clientSecret: 'secret',
    });

    const fetchMock = vi.mocked(fetch);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('returns a frozen result object', async () => {
    const result = await refreshAccessToken({
      tokenEndpoint: TOKEN_ENDPOINT,
      refreshToken: 'tok',
      clientId: 'id',
      clientSecret: 'secret',
    });

    expect(Object.isFrozen(result)).toBe(true);
  });
});
