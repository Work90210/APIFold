import type { AuthMode } from '@apifold/types';

import type { CredentialCache } from '../registry/credential-cache.js';

export interface AuthInjectorDeps {
  readonly credentialCache: CredentialCache;
}

/**
 * Build auth headers for an upstream request based on the server's auth mode.
 * Returns a new frozen headers object — never mutates input.
 *
 * When `userKey` is provided (public server pass-through), it is used directly
 * without touching the credential cache. The key is never stored or logged.
 */
export async function buildAuthHeaders(
  deps: AuthInjectorDeps,
  serverId: string,
  authMode: AuthMode,
  userKey?: string,
): Promise<Readonly<Record<string, string>>> {
  if (authMode === 'none') {
    return Object.freeze({});
  }

  if (userKey) {
    const sanitized = userKey.replace(/[\r\n]/g, '');
    if (authMode === 'api_key') {
      return Object.freeze({ 'X-API-Key': sanitized });
    }
    return Object.freeze({ Authorization: `Bearer ${sanitized}` });
  }

  return deps.credentialCache.getHeaders(serverId);
}
