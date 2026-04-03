import { getServerPostHog } from './posthog-server';

async function captureAndFlush(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  const ph = getServerPostHog();
  if (!ph) return;
  ph.capture({ distinctId, event, properties });
  await ph.flush();
}

export async function serverTrackDeploy(params: {
  readonly userId: string;
  readonly listingSlug: string;
  readonly serverId: string;
  readonly toolCount: number;
}): Promise<void> {
  await captureAndFlush(params.userId, 'marketplace_deploy', {
    listing_slug: params.listingSlug,
    server_id: params.serverId,
    tool_count: params.toolCount,
  });
}

export async function serverTrackUninstall(params: {
  readonly userId: string;
  readonly listingSlug?: string;
  readonly serverId: string;
}): Promise<void> {
  await captureAndFlush(params.userId, 'marketplace_uninstall', {
    listing_slug: params.listingSlug,
    server_id: params.serverId,
  });
}

export async function serverTrackSignUp(userId: string): Promise<void> {
  const ph = getServerPostHog();
  if (!ph) return;
  ph.identify({ distinctId: userId, properties: { plan: 'free' } });
  ph.capture({ distinctId: userId, event: 'user_signed_up' });
  await ph.flush();
}

export async function serverTrackTokenRotation(params: {
  readonly userId: string;
  readonly serverId: string;
}): Promise<void> {
  await captureAndFlush(params.userId, 'server_token_rotated', {
    server_id: params.serverId,
  });
}

export async function serverTrackSpecImported(params: {
  readonly userId: string;
  readonly specId: string;
  readonly name: string;
  readonly toolCount: number;
}): Promise<void> {
  await captureAndFlush(params.userId, 'spec_imported', {
    spec_id: params.specId,
    name: params.name,
    tool_count: params.toolCount,
  });
}

export async function serverTrackSpecValidationError(params: {
  readonly userId: string;
  readonly errorType: string;
}): Promise<void> {
  await captureAndFlush(params.userId, 'spec_validation_error', {
    error_type: params.errorType,
  });
}

export async function serverTrackServerCreated(params: {
  readonly userId: string;
  readonly serverId: string;
  readonly slug: string;
  readonly source: 'manual' | 'marketplace';
}): Promise<void> {
  await captureAndFlush(params.userId, 'server_created', {
    server_id: params.serverId,
    slug: params.slug,
    source: params.source,
  });
}

export async function serverTrackCheckoutStarted(params: {
  readonly userId: string;
  readonly plan: string;
}): Promise<void> {
  await captureAndFlush(params.userId, 'checkout_started', {
    plan: params.plan,
  });
}

export async function serverTrackPlanUpgrade(params: {
  readonly userId: string;
  readonly fromPlan: string;
  readonly toPlan: string;
}): Promise<void> {
  await captureAndFlush(params.userId, 'plan_upgrade', {
    from_plan: params.fromPlan,
    to_plan: params.toPlan,
  });
}
