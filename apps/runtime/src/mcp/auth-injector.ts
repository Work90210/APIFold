import type { AuthMode } from '@apifold/types';

import type { CredentialCache } from '../registry/credential-cache.js';

export interface AuthInjectorDeps {
  readonly credentialCache: CredentialCache;
}

/**
 * Build auth headers for an upstream request based on the server's auth mode.
 * Returns a new frozen headers object — never mutates input.
 */
export async function buildAuthHeaders(
  deps: AuthInjectorDeps,
  serverId: string,
  authMode: AuthMode,
): Promise<Readonly<Record<string, string>>> {
  if (authMode === 'none') {
    return Object.freeze({});
  }

  return deps.credentialCache.getHeaders(serverId);
}
