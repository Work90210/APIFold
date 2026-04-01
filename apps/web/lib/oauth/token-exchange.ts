import { safeFetch } from '../ssrf-guard';

const TOKEN_EXCHANGE_TIMEOUT_MS = 15_000;
const ALLOWED_PROTOCOLS = new Set(['https:']);
const PRIVATE_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^0\.0\.0\.0$/,
];

function validateTokenEndpoint(endpoint: string): void {
  const parsed = new URL(endpoint);
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new Error('Token endpoint must use HTTPS');
  }
  if (PRIVATE_HOSTNAME_PATTERNS.some((p) => p.test(parsed.hostname))) {
    throw new Error('Token endpoint must not point to a private address');
  }
}

export interface TokenResponse {
  readonly accessToken: string;
  readonly refreshToken: string | null;
  readonly expiresIn: number | null;
  readonly scope: string | null;
  readonly tokenType: string;
}

export async function exchangeAuthorizationCode(params: {
  readonly tokenEndpoint: string;
  readonly code: string;
  readonly codeVerifier: string;
  readonly redirectUri: string;
  readonly clientId: string;
  readonly clientSecret: string;
}): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: params.redirectUri,
    code_verifier: params.codeVerifier,
    client_id: params.clientId,
    client_secret: params.clientSecret,
  });

  return executeTokenRequest(params.tokenEndpoint, body);
}

export async function exchangeClientCredentials(params: {
  readonly tokenEndpoint: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly scopes: readonly string[];
  readonly scopeSeparator: string;
}): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: params.clientId,
    client_secret: params.clientSecret,
  });

  if (params.scopes.length > 0) {
    body.set('scope', params.scopes.join(params.scopeSeparator));
  }

  return executeTokenRequest(params.tokenEndpoint, body);
}

export async function refreshAccessToken(params: {
  readonly tokenEndpoint: string;
  readonly refreshToken: string;
  readonly clientId: string;
  readonly clientSecret: string;
}): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: params.refreshToken,
    client_id: params.clientId,
    client_secret: params.clientSecret,
  });

  return executeTokenRequest(params.tokenEndpoint, body);
}

async function executeTokenRequest(
  tokenEndpoint: string,
  body: URLSearchParams,
): Promise<TokenResponse> {
  validateTokenEndpoint(tokenEndpoint);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TOKEN_EXCHANGE_TIMEOUT_MS);

  let response: globalThis.Response;
  try {
    response = await safeFetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Token exchange failed (HTTP ${response.status}): ${errorBody.slice(0, 200)}`,
    );
  }

  const json = (await response.json()) as Record<string, unknown>;

  return Object.freeze({
    accessToken: String(json['access_token'] ?? ''),
    refreshToken: json['refresh_token'] ? String(json['refresh_token']) : null,
    expiresIn: typeof json['expires_in'] === 'number' ? json['expires_in'] : null,
    scope: json['scope'] ? String(json['scope']) : null,
    tokenType: String(json['token_type'] ?? 'Bearer'),
  });
}
