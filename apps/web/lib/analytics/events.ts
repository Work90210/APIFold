import { getPostHog } from './posthog-client';
import { getServerPostHog } from './posthog-server';

// ── Client-side events ──────────────────────────────────────────────

export function trackPageView(url: string): void {
  getPostHog()?.capture('$pageview', { $current_url: url });
}

export function trackMarketplaceBrowse(params: {
  readonly category?: string;
  readonly query?: string;
  readonly sort?: string;
  readonly resultCount: number;
}): void {
  getPostHog()?.capture('marketplace_browse', params);
}

export function trackMarketplaceListingView(params: {
  readonly slug: string;
  readonly name: string;
  readonly category: string;
}): void {
  getPostHog()?.capture('marketplace_listing_view', params);
}

export function trackMarketplaceDeploy(params: {
  readonly slug: string;
  readonly name: string;
  readonly category: string;
  readonly success: boolean;
  readonly error?: string;
}): void {
  getPostHog()?.capture('marketplace_deploy', params);
}

export function trackServerCreated(params: {
  readonly serverId: string;
  readonly source: 'marketplace' | 'manual';
}): void {
  getPostHog()?.capture('server_created', params);
}

export function trackCookieConsent(params: {
  readonly analytics: boolean;
  readonly heatmaps: boolean;
  readonly sessionRecording: boolean;
}): void {
  getPostHog()?.capture('cookie_consent', params);
}

// ── Server-side events ──────────────────────────────────────────────

export function serverTrackDeploy(params: {
  readonly userId: string;
  readonly listingSlug: string;
  readonly serverId: string;
  readonly toolCount: number;
}): void {
  getServerPostHog()?.capture({
    distinctId: params.userId,
    event: 'marketplace_deploy_server',
    properties: {
      listing_slug: params.listingSlug,
      server_id: params.serverId,
      tool_count: params.toolCount,
    },
  });
}

export function serverTrackUninstall(params: {
  readonly userId: string;
  readonly listingSlug?: string;
  readonly serverId: string;
}): void {
  getServerPostHog()?.capture({
    distinctId: params.userId,
    event: 'marketplace_uninstall',
    properties: {
      listing_slug: params.listingSlug,
      server_id: params.serverId,
    },
  });
}

export function serverTrackSignUp(userId: string): void {
  getServerPostHog()?.capture({
    distinctId: userId,
    event: 'user_signed_up',
  });
}

export function serverTrackTokenRotation(params: {
  readonly userId: string;
  readonly serverId: string;
}): void {
  getServerPostHog()?.capture({
    distinctId: params.userId,
    event: 'server_token_rotated',
    properties: { server_id: params.serverId },
  });
}
