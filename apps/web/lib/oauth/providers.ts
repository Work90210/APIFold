import type { OAuthProviderPreset } from './types.js';

const PROVIDER_LIST: readonly OAuthProviderPreset[] = Object.freeze([
  {
    id: 'google',
    name: 'Google',
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    defaultScopes: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/spreadsheets.readonly',
    ],
    scopeSeparator: ' ',
  },
  {
    id: 'slack',
    name: 'Slack',
    authorizationEndpoint: 'https://slack.com/oauth/v2/authorize',
    tokenEndpoint: 'https://slack.com/api/oauth.v2.access',
    defaultScopes: ['channels:read', 'chat:write', 'users:read'],
    // Slack deviates from RFC 6749 — it uses comma-separated scopes, not space-separated.
    scopeSeparator: ',',
  },
  {
    id: 'microsoft',
    name: 'Microsoft Graph',
    authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    defaultScopes: ['User.Read', 'Mail.Read', 'Calendars.Read'],
    scopeSeparator: ' ',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    authorizationEndpoint: 'https://app.hubspot.com/oauth/authorize',
    tokenEndpoint: 'https://api.hubapi.com/oauth/v1/token',
    defaultScopes: ['crm.objects.contacts.read', 'crm.objects.deals.read'],
    scopeSeparator: ' ',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    authorizationEndpoint: 'https://login.salesforce.com/services/oauth2/authorize',
    tokenEndpoint: 'https://login.salesforce.com/services/oauth2/token',
    defaultScopes: ['api', 'refresh_token'],
    scopeSeparator: ' ',
  },
  {
    id: 'notion',
    name: 'Notion',
    authorizationEndpoint: 'https://api.notion.com/v1/oauth/authorize',
    tokenEndpoint: 'https://api.notion.com/v1/oauth/token',
    defaultScopes: [],
    scopeSeparator: ' ',
  },
  {
    id: 'github',
    name: 'GitHub',
    authorizationEndpoint: 'https://github.com/login/oauth/authorize',
    tokenEndpoint: 'https://github.com/login/oauth/access_token',
    defaultScopes: ['repo', 'read:user'],
    scopeSeparator: ' ',
  },
  {
    id: 'spotify',
    name: 'Spotify',
    authorizationEndpoint: 'https://accounts.spotify.com/authorize',
    tokenEndpoint: 'https://accounts.spotify.com/api/token',
    defaultScopes: ['user-read-private', 'user-read-email', 'playlist-read-private'],
    scopeSeparator: ' ',
  },
]);

const PROVIDERS_BY_ID: ReadonlyMap<string, OAuthProviderPreset> = new Map(
  PROVIDER_LIST.map((p) => [p.id, p]),
);

export function getProviderPreset(providerId: string): OAuthProviderPreset | undefined {
  return PROVIDERS_BY_ID.get(providerId);
}

export function getAllProviderPresets(): readonly OAuthProviderPreset[] {
  return PROVIDER_LIST;
}
