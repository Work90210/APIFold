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
