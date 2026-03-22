import type { AuthMode } from './server.js';

export type CredentialAuthType = Exclude<AuthMode, 'none'>;

declare const PlaintextKeyBrand: unique symbol;
export type PlaintextKey = string & { readonly [PlaintextKeyBrand]: never };

export function createPlaintextKey(value: string): PlaintextKey {
  if (value.length === 0) {
    throw new Error('Plaintext key must not be empty');
  }
  return value as PlaintextKey;
}

// authorizationEndpoint is intentionally NOT stored in the DB — it is resolved
// at runtime from the provider preset via getProviderPreset(). Only the
// tokenEndpoint is persisted because it is needed for token refresh.
export interface OAuthConfig {
  readonly provider: string;
  readonly clientId: string;
  readonly scopes: readonly string[];
  readonly tokenEndpoint: string;
  readonly tokenExpiresAt?: Date;
}

export interface SafeCredential {
  readonly id: string;
  readonly serverId: string;
  readonly userId: string;
  readonly label: string;
  readonly authType: CredentialAuthType;
  readonly expiresAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly scopes: readonly string[];
  readonly tokenEndpoint: string | null;
  readonly clientId: string | null;
  readonly tokenExpiresAt: Date | null;
  readonly provider: string | null;
}

export interface Credential extends SafeCredential {
  readonly encryptedKey: string;
  readonly encryptedRefreshToken: string | null;
  readonly encryptedClientSecret: string | null;
}

export interface CreateCredentialInput {
  readonly serverId: string;
  readonly label: string;
  readonly plaintextKey: PlaintextKey;
  readonly authType: CredentialAuthType;
  readonly expiresAt?: Date | null;
  readonly refreshToken?: PlaintextKey;
  readonly scopes?: readonly string[];
  readonly tokenEndpoint?: string;
  readonly clientId?: string;
  readonly clientSecret?: PlaintextKey;
  readonly tokenExpiresAt?: Date | null;
  readonly provider?: string;
}

export interface UpdateCredentialInput {
  readonly label?: string;
  readonly plaintextKey?: PlaintextKey;
  readonly authType?: CredentialAuthType;
  readonly expiresAt?: Date | null;
  readonly refreshToken?: PlaintextKey | null;
  readonly scopes?: readonly string[];
  readonly tokenEndpoint?: string | null;
  readonly clientId?: string | null;
  readonly clientSecret?: PlaintextKey | null;
  readonly tokenExpiresAt?: Date | null;
  readonly provider?: string | null;
}

export interface CredentialFilters {
  readonly serverId?: string;
  readonly authType?: CredentialAuthType;
  readonly provider?: string;
}
