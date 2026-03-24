export type TransportType = 'sse' | 'streamable-http';

export type AuthMode = 'none' | 'api_key' | 'bearer' | 'oauth2_authcode' | 'oauth2_client_creds';

export interface McpServer {
  readonly id: string;
  readonly specId: string;
  readonly userId: string;
  readonly slug: string;
  readonly endpointId: string;
  readonly name: string;
  readonly transport: TransportType;
  readonly authMode: AuthMode;
  readonly baseUrl: string;
  /** Maximum requests allowed per minute */
  readonly rateLimitPerMinute: number;
  readonly isActive: boolean;
  readonly customDomain: string | null;
  readonly domainVerifiedAt: Date | null;
  readonly tokenHash: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ServerTokenResponse {
  readonly token: string;
  readonly tokenWarning: 'This token will not be shown again.';
}

export interface CreateServerInput {
  readonly specId: string;
  readonly slug: string;
  readonly name: string;
  readonly transport?: TransportType;
  readonly authMode: AuthMode;
  readonly baseUrl: string;
  readonly rateLimitPerMinute?: number;
}

export interface UpdateServerInput {
  readonly name?: string;
  readonly transport?: TransportType;
  readonly authMode?: AuthMode;
  readonly baseUrl?: string;
  readonly rateLimitPerMinute?: number;
  readonly isActive?: boolean;
  readonly customDomain?: string | null;
}

export interface ServerFilters {
  readonly specId?: string;
  readonly isActive?: boolean;
  readonly slug?: string;
}
