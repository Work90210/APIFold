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
  readonly tab?: string;
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
  readonly slug: string;
  readonly source: 'marketplace' | 'manual';
}): void {
  getPostHog()?.capture('server_created', params);
}

export function trackServerDeleted(serverId: string): void {
  getPostHog()?.capture('server_deleted', { server_id: serverId });
}

export function trackSpecImported(params: {
  readonly specId: string;
  readonly name: string;
  readonly toolCount: number;
}): void {
  getPostHog()?.capture('spec_imported', params);
}

export function trackCookieConsent(params: {
  readonly analytics: boolean;
  readonly heatmaps: boolean;
  readonly sessionRecording: boolean;
}): void {
  getPostHog()?.capture('cookie_consent', params);
}

export function trackSearch(params: {
  readonly query: string;
  readonly resultCount: number;
  readonly source: 'marketplace' | 'command_palette';
}): void {
  getPostHog()?.capture('search', params);
}

export function trackError(params: {
  readonly error: string;
  readonly context: string;
  readonly fatal?: boolean;
}): void {
  getPostHog()?.capture('client_error', params);
}

export function trackCtaClick(params: {
  readonly cta: string;
  readonly location: string;
}): void {
  getPostHog()?.capture('cta_click', params);
}

export function trackVersionSelected(params: {
  readonly slug: string;
  readonly fromVersion: string;
  readonly toVersion: string;
}): void {
  getPostHog()?.capture('version_selected', params);
}

export function trackTabChange(params: {
  readonly slug: string;
  readonly tab: string;
}): void {
  getPostHog()?.capture('listing_tab_change', params);
}

// ── Revenue tracking ────────────────────────────────────────────────

export function trackPlanUpgrade(params: {
  readonly fromPlan: string;
  readonly toPlan: string;
  readonly revenue: number;
  readonly currency: string;
}): void {
  getPostHog()?.capture('plan_upgrade', {
    ...params,
    $set: { plan: params.toPlan },
  });
}

export function trackCheckoutStarted(plan: string): void {
  getPostHog()?.capture('checkout_started', { plan });
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

export function serverTrackSignUp(params: {
  readonly userId: string;
  readonly email?: string;
}): void {
  const ph = getServerPostHog();
  if (!ph) return;
  ph.capture({
    distinctId: params.userId,
    event: 'user_signed_up',
    properties: { email: params.email },
  });
  // Also identify on server side for proper user profiles
  ph.identify({
    distinctId: params.userId,
    properties: { email: params.email, plan: 'free' },
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

export function serverTrackApiRequest(params: {
  readonly userId: string;
  readonly endpoint: string;
  readonly method: string;
  readonly statusCode: number;
  readonly durationMs: number;
}): void {
  getServerPostHog()?.capture({
    distinctId: params.userId,
    event: 'api_request',
    properties: {
      endpoint: params.endpoint,
      method: params.method,
      status_code: params.statusCode,
      duration_ms: params.durationMs,
    },
  });
}
