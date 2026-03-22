import { NextResponse, type NextRequest } from 'next/server';
import { createPlaintextKey } from '@apifold/types';
import { getUserId, withErrorHandler } from '../../../../lib/api-helpers';
import { getDb } from '../../../../lib/db/index';
import { CredentialRepository } from '../../../../lib/db/repositories/credential.repository';
import { retrieveOAuthState } from '../../../../lib/oauth/state-store';
import { exchangeAuthorizationCode } from '../../../../lib/oauth/token-exchange';
import { getProviderPreset } from '../../../../lib/oauth/providers';
import { decryptCredential } from '../../../../lib/vault/index';

function buildCallbackUrl(request: NextRequest): string {
  const url = new URL(request.url);
  return `${url.origin}/api/oauth/callback`;
}

export function GET(request: NextRequest): Promise<NextResponse> {
  return withErrorHandler(async () => {
    const userId = await getUserId();

    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Handle provider-side errors
    if (error) {
      const errorDescription = url.searchParams.get('error_description') ?? error;
      return NextResponse.redirect(
        new URL(`/dashboard?oauth_error=${encodeURIComponent(errorDescription)}`, url.origin),
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard?oauth_error=Missing+code+or+state+parameter', url.origin),
      );
    }

    // Retrieve and validate state from Redis (single-use)
    const storedState = await retrieveOAuthState(state);
    if (!storedState) {
      return NextResponse.redirect(
        new URL('/dashboard?oauth_error=Invalid+or+expired+state+parameter', url.origin),
      );
    }

    // Verify the callback is for the authenticated user
    if (storedState.userId !== userId) {
      return NextResponse.redirect(
        new URL('/dashboard?oauth_error=State+does+not+match+authenticated+user', url.origin),
      );
    }

    const preset = getProviderPreset(storedState.provider);
    if (!preset) {
      return NextResponse.redirect(
        new URL('/dashboard?oauth_error=Unknown+provider', url.origin),
      );
    }

    // Decrypt client credentials from the encrypted Redis state
    const clientId = decryptCredential(storedState.encryptedClientId);
    const clientSecret = decryptCredential(storedState.encryptedClientSecret);

    // Exchange authorization code for tokens
    let tokenResponse;
    try {
      tokenResponse = await exchangeAuthorizationCode({
        tokenEndpoint: storedState.tokenEndpoint,
        code,
        codeVerifier: storedState.codeVerifier,
        redirectUri: buildCallbackUrl(request),
        clientId,
        clientSecret,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Token exchange failed';
      return NextResponse.redirect(
        new URL(`/dashboard?oauth_error=${encodeURIComponent(msg)}`, url.origin),
      );
    }

    // Calculate token expiry
    const tokenExpiresAt = tokenResponse.expiresIn
      ? new Date(Date.now() + tokenResponse.expiresIn * 1000)
      : null;

    // Store credential
    const db = getDb();
    const credentialRepo = new CredentialRepository(db);

    await credentialRepo.create(userId, {
      serverId: storedState.serverId,
      label: `${preset.name} OAuth`,
      plaintextKey: createPlaintextKey(tokenResponse.accessToken),
      authType: 'oauth2_authcode',
      refreshToken: tokenResponse.refreshToken
        ? createPlaintextKey(tokenResponse.refreshToken)
        : undefined,
      scopes: storedState.scopes,
      tokenEndpoint: storedState.tokenEndpoint,
      clientId,
      clientSecret: createPlaintextKey(clientSecret),
      tokenExpiresAt,
      provider: storedState.provider,
    });

    // Redirect to dashboard with success
    return NextResponse.redirect(
      new URL(
        `/dashboard/servers/${storedState.serverId}/credentials?oauth_success=${encodeURIComponent(preset.name)}`,
        url.origin,
      ),
    );
  });
}
