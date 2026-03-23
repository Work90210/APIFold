import { getRedis } from '../redis';

const STATE_PREFIX = 'oauth:pkce:';
const STATE_TTL_SECONDS = 300; // 5 minutes

export interface OAuthState {
  readonly serverId: string;
  readonly userId: string;
  readonly provider: string;
  readonly codeVerifier: string;
  readonly scopes: readonly string[];
  readonly tokenEndpoint: string;
  readonly encryptedClientId: string;
  readonly encryptedClientSecret: string;
  readonly createdAt: number;
}

export async function storeOAuthState(state: string, data: OAuthState): Promise<void> {
  const redis = getRedis();
  await redis.set(
    `${STATE_PREFIX}${state}`,
    JSON.stringify(data),
    'EX',
    STATE_TTL_SECONDS,
  );
}

export async function retrieveOAuthState(state: string): Promise<OAuthState | null> {
  const redis = getRedis();
  const raw = await redis.get(`${STATE_PREFIX}${state}`);
  if (!raw) {
    return null;
  }
  // Delete after retrieval — state is single-use
  await redis.del(`${STATE_PREFIX}${state}`);
  return JSON.parse(raw) as OAuthState;
}
