import { getPostHog } from './posthog-client';

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
  // Truncate and sanitize query to prevent PII leakage
  const safeQuery = params.query.slice(0, 100).replace(/[a-zA-Z0-9._+\x2d]{20,}@/g, '[REDACTED]@');
  getPostHog()?.capture('search', { ...params, query: safeQuery });
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

// ── Spec lifecycle ──────────────────────────────────────────────────

export function trackSpecValidationError(params: {
  readonly error: string;
  readonly specFormat: 'openapi3.0' | 'openapi3.1' | 'swagger2' | 'unknown';
}): void {
  getPostHog()?.capture('spec_validation_error', params);
}

export function trackSpecAutoConverted(params: {
  readonly fromVersion: string;
  readonly toolCount: number;
}): void {
  getPostHog()?.capture('spec_auto_converted', params);
}

// ── Server lifecycle ────────────────────────────────────────────────

export function trackServerConnected(params: {
  readonly serverId: string;
  readonly transport: 'sse' | 'streamable-http';
  readonly client: string;
}): void {
  getPostHog()?.capture('server_connected', params);
}

export function trackServerConnectionFailed(params: {
  readonly serverId: string;
  readonly error: string;
}): void {
  getPostHog()?.capture('server_connection_failed', params);
}

export function trackToolCalled(params: {
  readonly serverId: string;
  readonly toolName: string;
  readonly durationMs: number;
  readonly success: boolean;
}): void {
  getPostHog()?.capture('tool_called', params);
}

export function trackCredentialAdded(params: {
  readonly serverId: string;
  readonly authType: string;
}): void {
  getPostHog()?.capture('credential_added', params);
}

// ── Onboarding milestones ───────────────────────────────────────────

export function trackOnboardingStep(params: {
  readonly step: string;
  readonly stepNumber: number;
  readonly completed: boolean;
}): void {
  getPostHog()?.capture('onboarding_step', params);
}

export function trackActivation(params: {
  readonly trigger: 'first_spec' | 'first_server' | 'first_connection' | 'first_tool_call';
  readonly timeFromSignupMs: number;
}): void {
  getPostHog()?.capture('activation', params);
}

// ── Docs engagement ─────────────────────────────────────────────────

export function trackDocsPageView(params: {
  readonly slug: string;
  readonly section: string;
  readonly timeOnPageMs?: number;
}): void {
  getPostHog()?.capture('docs_page_viewed', params);
}

export function trackCodeCopied(params: {
  readonly page: string;
  readonly language: string;
  readonly snippetType: 'connection' | 'config' | 'code' | 'cli';
}): void {
  getPostHog()?.capture('code_copied', params);
}

// ── Feature engagement ──────────────────────────────────────────────

export function trackExportDownloaded(params: {
  readonly serverId: string;
  readonly format: string;
}): void {
  getPostHog()?.capture('export_downloaded', params);
}

export function trackConsoleUsed(params: {
  readonly serverId: string;
  readonly toolName: string;
  readonly success: boolean;
}): void {
  getPostHog()?.capture('console_used', params);
}

export function trackAnalyticsViewed(params: {
  readonly serverId: string;
  readonly timeRange: string;
}): void {
  getPostHog()?.capture('analytics_viewed', params);
}

// ── Growth ──────────────────────────────────────────────────────────

export function trackShareClicked(params: {
  readonly target: 'twitter' | 'linkedin' | 'copy_link' | 'email';
  readonly context: string;
}): void {
  getPostHog()?.capture('share_clicked', params);
}

export function trackGitHubStarClicked(params: {
  readonly location: string;
}): void {
  getPostHog()?.capture('github_star_clicked', params);
}

export function trackInviteSent(params: {
  readonly role: string;
}): void {
  getPostHog()?.capture('invite_sent', params);
}

// ── Billing ─────────────────────────────────────────────────────────

export function trackLimitWarningShown(params: {
  readonly resource: 'servers' | 'calls' | 'members';
  readonly percentUsed: number;
  readonly plan: string;
}): void {
  getPostHog()?.capture('limit_warning_shown', params);
}

export function trackUpgradeModalViewed(params: {
  readonly trigger: string;
  readonly currentPlan: string;
}): void {
  getPostHog()?.capture('upgrade_modal_viewed', params);
}

export function trackUpgradeDismissed(params: {
  readonly trigger: string;
  readonly currentPlan: string;
}): void {
  getPostHog()?.capture('upgrade_dismissed', params);
}

// ── Performance ─────────────────────────────────────────────────────

export function trackPagePerformance(params: {
  readonly page: string;
  readonly ttfb: number;
  readonly fcp: number;
  readonly lcp: number;
  readonly cls: number;
}): void {
  getPostHog()?.capture('page_performance', params);
}
