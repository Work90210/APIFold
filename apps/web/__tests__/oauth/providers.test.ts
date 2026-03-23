import { describe, it, expect } from 'vitest';
import {
  getAllProviderPresets,
  getProviderPreset,
} from '../../lib/oauth/providers.js';

describe('getAllProviderPresets', () => {
  it('returns exactly 8 providers', () => {
    expect(getAllProviderPresets()).toHaveLength(8);
  });

  it('returns a frozen/immutable array', () => {
    const presets = getAllProviderPresets();
    expect(Object.isFrozen(presets)).toBe(true);
  });

  it('every provider has a non-empty id', () => {
    for (const preset of getAllProviderPresets()) {
      expect(preset.id.length).toBeGreaterThan(0);
    }
  });

  it('every provider has a non-empty name', () => {
    for (const preset of getAllProviderPresets()) {
      expect(preset.name.length).toBeGreaterThan(0);
    }
  });

  it('every provider has a valid HTTPS authorizationEndpoint', () => {
    for (const preset of getAllProviderPresets()) {
      expect(preset.authorizationEndpoint).toMatch(/^https:\/\//);
      expect(() => new URL(preset.authorizationEndpoint)).not.toThrow();
    }
  });

  it('every provider has a valid HTTPS tokenEndpoint', () => {
    for (const preset of getAllProviderPresets()) {
      expect(preset.tokenEndpoint).toMatch(/^https:\/\//);
      expect(() => new URL(preset.tokenEndpoint)).not.toThrow();
    }
  });
});

describe('getProviderPreset', () => {
  it('returns correct Google config', () => {
    const preset = getProviderPreset('google');
    expect(preset).toBeDefined();
    expect(preset!.id).toBe('google');
    expect(preset!.name).toBe('Google');
    expect(preset!.authorizationEndpoint).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth',
    );
    expect(preset!.tokenEndpoint).toBe('https://oauth2.googleapis.com/token');
    expect(preset!.scopeSeparator).toBe(' ');
    expect(preset!.defaultScopes).toContain(
      'https://www.googleapis.com/auth/gmail.readonly',
    );
    expect(preset!.defaultScopes).toHaveLength(4);
  });

  it('returns correct Slack config with comma separator', () => {
    const preset = getProviderPreset('slack');
    expect(preset).toBeDefined();
    expect(preset!.id).toBe('slack');
    expect(preset!.name).toBe('Slack');
    expect(preset!.authorizationEndpoint).toBe(
      'https://slack.com/oauth/v2/authorize',
    );
    expect(preset!.tokenEndpoint).toBe(
      'https://slack.com/api/oauth.v2.access',
    );
    expect(preset!.scopeSeparator).toBe(',');
    expect(preset!.defaultScopes).toContain('channels:read');
    expect(preset!.defaultScopes).toContain('chat:write');
    expect(preset!.defaultScopes).toContain('users:read');
  });

  it('returns correct Microsoft Graph config', () => {
    const preset = getProviderPreset('microsoft');
    expect(preset).toBeDefined();
    expect(preset!.id).toBe('microsoft');
    expect(preset!.name).toBe('Microsoft Graph');
    expect(preset!.authorizationEndpoint).toBe(
      'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    );
    expect(preset!.tokenEndpoint).toBe(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    );
    expect(preset!.scopeSeparator).toBe(' ');
    expect(preset!.defaultScopes).toContain('User.Read');
    expect(preset!.defaultScopes).toContain('Mail.Read');
    expect(preset!.defaultScopes).toContain('Calendars.Read');
  });

  it('returns correct HubSpot config', () => {
    const preset = getProviderPreset('hubspot');
    expect(preset).toBeDefined();
    expect(preset!.id).toBe('hubspot');
    expect(preset!.name).toBe('HubSpot');
    expect(preset!.authorizationEndpoint).toBe(
      'https://app.hubspot.com/oauth/authorize',
    );
    expect(preset!.tokenEndpoint).toBe(
      'https://api.hubapi.com/oauth/v1/token',
    );
    expect(preset!.scopeSeparator).toBe(' ');
    expect(preset!.defaultScopes).toContain('crm.objects.contacts.read');
    expect(preset!.defaultScopes).toContain('crm.objects.deals.read');
  });

  it('returns correct Salesforce config', () => {
    const preset = getProviderPreset('salesforce');
    expect(preset).toBeDefined();
    expect(preset!.id).toBe('salesforce');
    expect(preset!.name).toBe('Salesforce');
    expect(preset!.authorizationEndpoint).toBe(
      'https://login.salesforce.com/services/oauth2/authorize',
    );
    expect(preset!.tokenEndpoint).toBe(
      'https://login.salesforce.com/services/oauth2/token',
    );
    expect(preset!.scopeSeparator).toBe(' ');
    expect(preset!.defaultScopes).toContain('api');
    expect(preset!.defaultScopes).toContain('refresh_token');
  });

  it('returns correct Notion config with empty defaultScopes', () => {
    const preset = getProviderPreset('notion');
    expect(preset).toBeDefined();
    expect(preset!.id).toBe('notion');
    expect(preset!.name).toBe('Notion');
    expect(preset!.authorizationEndpoint).toBe(
      'https://api.notion.com/v1/oauth/authorize',
    );
    expect(preset!.tokenEndpoint).toBe('https://api.notion.com/v1/oauth/token');
    expect(preset!.scopeSeparator).toBe(' ');
    expect(preset!.defaultScopes).toHaveLength(0);
  });

  it('returns correct GitHub config', () => {
    const preset = getProviderPreset('github');
    expect(preset).toBeDefined();
    expect(preset!.id).toBe('github');
    expect(preset!.name).toBe('GitHub');
    expect(preset!.authorizationEndpoint).toBe(
      'https://github.com/login/oauth/authorize',
    );
    expect(preset!.tokenEndpoint).toBe(
      'https://github.com/login/oauth/access_token',
    );
    expect(preset!.scopeSeparator).toBe(' ');
    expect(preset!.defaultScopes).toContain('repo');
    expect(preset!.defaultScopes).toContain('read:user');
  });

  it('returns correct Spotify config', () => {
    const preset = getProviderPreset('spotify');
    expect(preset).toBeDefined();
    expect(preset!.id).toBe('spotify');
    expect(preset!.name).toBe('Spotify');
    expect(preset!.authorizationEndpoint).toBe(
      'https://accounts.spotify.com/authorize',
    );
    expect(preset!.tokenEndpoint).toBe(
      'https://accounts.spotify.com/api/token',
    );
    expect(preset!.scopeSeparator).toBe(' ');
    expect(preset!.defaultScopes).toContain('user-read-private');
    expect(preset!.defaultScopes).toContain('user-read-email');
    expect(preset!.defaultScopes).toContain('playlist-read-private');
  });

  it('returns undefined for a nonexistent provider', () => {
    expect(getProviderPreset('nonexistent')).toBeUndefined();
  });

  it('returns undefined for an empty string provider id', () => {
    expect(getProviderPreset('')).toBeUndefined();
  });

  it('is case-sensitive and does not match uppercase id', () => {
    expect(getProviderPreset('Google')).toBeUndefined();
    expect(getProviderPreset('GITHUB')).toBeUndefined();
  });

  it('returned preset object has the expected shape (id, name, endpoints, scopes, separator)', () => {
    const preset = getProviderPreset('google');
    expect(preset).toBeDefined();
    expect(typeof preset!.id).toBe('string');
    expect(typeof preset!.name).toBe('string');
    expect(typeof preset!.authorizationEndpoint).toBe('string');
    expect(typeof preset!.tokenEndpoint).toBe('string');
    expect(Array.isArray(preset!.defaultScopes)).toBe(true);
    expect(typeof preset!.scopeSeparator).toBe('string');
  });
});
