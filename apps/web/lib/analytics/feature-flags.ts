import { getPostHog } from './posthog-client';
import { getServerPostHog } from './posthog-server';

// ── Client-side feature flags ───────────────────────────────────────

export function isFeatureEnabled(flag: string): boolean {
  return getPostHog()?.isFeatureEnabled(flag) ?? false;
}

export function getFeatureFlag(flag: string): string | boolean | undefined {
  return getPostHog()?.getFeatureFlag(flag);
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

// ── Known feature flag names ────────────────────────────────────────

export const FLAGS = {
  MARKETPLACE_ENABLED: 'marketplace-enabled',
  MARKETPLACE_PUBLISHING: 'marketplace-publishing',
  MARKETPLACE_ADMIN_REVIEW: 'marketplace-admin-review',
  SESSION_RECORDING: 'session-recording',
  HEATMAPS: 'heatmaps',
} as const;
