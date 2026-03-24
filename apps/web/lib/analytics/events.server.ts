import { getServerPostHog } from './posthog-server';

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
