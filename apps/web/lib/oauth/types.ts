export interface OAuthProviderPreset {
  readonly id: string;
  readonly name: string;
  readonly authorizationEndpoint: string;
  readonly tokenEndpoint: string;
  readonly defaultScopes: readonly string[];
  readonly scopeSeparator: string;
}
