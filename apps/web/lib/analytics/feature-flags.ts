import { getPostHog } from './posthog-client';
import { getServerPostHog } from './posthog-server';

// ── Client-side feature flags ───────────────────────────────────────

export function isFeatureEnabled(flag: string): boolean {
  return getPostHog()?.isFeatureEnabled(flag) ?? false;
}

export function getFeatureFlag(flag: string): string | boolean | undefined {
  return getPostHog()?.getFeatureFlag(flag);
}

export function getFeatureFlagPayload(flag: string): unknown {
  return getPostHog()?.getFeatureFlagPayload(flag);
}

// ── Client-side experiments ─────────────────────────────────────────

export function getExperimentVariant(experiment: string): string | boolean | undefined {
  return getPostHog()?.getFeatureFlag(experiment);
}

export function trackExperimentExposure(experiment: string): void {
  const variant = getExperimentVariant(experiment);
  if (variant !== undefined) {
    getPostHog()?.capture('$feature_flag_called', {
      $feature_flag: experiment,
      $feature_flag_response: variant,
    });
  }
}

// ── Server-side feature flags ───────────────────────────────────────

export async function isFeatureEnabledForUser(
  flag: string,
  userId: string,
): Promise<boolean> {
  const ph = getServerPostHog();
  if (!ph) return false;
  const result = await ph.isFeatureEnabled(flag, userId);
  return result ?? false;
}

export async function getFeatureFlagForUser(
  flag: string,
  userId: string,
): Promise<string | boolean | undefined> {
  const ph = getServerPostHog();
  if (!ph) return undefined;
  return ph.getFeatureFlag(flag, userId);
}

export async function getFeatureFlagPayloadForUser(
  flag: string,
  userId: string,
): Promise<unknown> {
  const ph = getServerPostHog();
  if (!ph) return undefined;
  return ph.getFeatureFlagPayload(flag, userId);
}

export async function getAllFlagsForUser(
  userId: string,
): Promise<Record<string, string | boolean>> {
  const ph = getServerPostHog();
  if (!ph) return {};
  return ph.getAllFlags(userId);
}

// ── Known feature flag names ────────────────────────────────────────

export const FLAGS = {
  MARKETPLACE_ENABLED: 'marketplace-enabled',
  MARKETPLACE_PUBLISHING: 'marketplace-publishing',
  MARKETPLACE_ADMIN_REVIEW: 'marketplace-admin-review',
  SESSION_RECORDING: 'session-recording',
  HEATMAPS: 'heatmaps',
  CUSTOM_DOMAINS: 'custom-domains',
  OAUTH_PROVIDERS: 'oauth-providers',
  CLI_ENABLED: 'cli-enabled',
} as const;

// ── Known experiment names ──────────────────────────────────────────

export const EXPERIMENTS = {
  // Landing page funnel
  HERO_HEADLINE: 'hero-headline',
  HERO_CTA_COLOR: 'hero-cta-color',
  HERO_CTA_TEXT: 'hero-cta-text',
  SOCIAL_PROOF_POSITION: 'social-proof-position',
  TERMINAL_DEMO_VS_VIDEO: 'terminal-demo-vs-video',
  LANDING_PAGE_LENGTH: 'landing-page-length',
  PRICING_ANCHOR: 'pricing-anchor',
  PRICING_ANNUAL_TOGGLE: 'pricing-annual-toggle',

  // Signup / onboarding
  SIGNUP_SOCIAL_VS_EMAIL: 'signup-social-vs-email',
  ONBOARDING_FLOW: 'onboarding-flow',
  FIRST_SPEC_PROMPT: 'first-spec-prompt',

  // Dashboard / engagement
  DASHBOARD_LAYOUT: 'dashboard-layout',
  EMPTY_STATE_STYLE: 'empty-state-style',
  SERVER_CARD_INFO: 'server-card-info',
  NAV_STYLE: 'nav-style',
  MARKETPLACE_LAYOUT: 'marketplace-layout',
  DEPLOY_CTA_COPY: 'deploy-cta-copy',
  PRICING_PAGE: 'pricing-page-v2',

  // Conversion / upgrade
  UPGRADE_PROMPT_TIMING: 'upgrade-prompt-timing',
  UPGRADE_MODAL_STYLE: 'upgrade-modal-style',
  FREE_TRIAL_VS_FREEMIUM: 'free-trial-vs-freemium',

  // Docs / support
  DOCS_SIDEBAR_STYLE: 'docs-sidebar-style',
  CODE_SNIPPET_LANGUAGE: 'code-snippet-language',

  // Retention
  CONNECTION_SNIPPET_FORMAT: 'connection-snippet-format',
  TOOL_LIST_DISPLAY: 'tool-list-display',
  ERROR_MESSAGE_STYLE: 'error-message-style',

  // Growth / virality
  SHARE_PROMPT: 'share-prompt',
  GITHUB_STAR_PROMPT: 'github-star-prompt',
} as const;
