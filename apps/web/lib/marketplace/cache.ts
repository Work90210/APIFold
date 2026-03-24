import { getRedis } from '../redis';

const CACHE_PREFIX = 'marketplace';

const TTL = {
  browse: 300,       // 5 minutes
  detail: 600,       // 10 minutes
  categories: 3600,  // 1 hour
  featured: 900,     // 15 minutes
  icon: 86400,       // 24 hours
} as const;

function buildKey(...parts: string[]): string {
  return `${CACHE_PREFIX}:${parts.join(':')}`;
}

export function buildBrowseKey(params: Record<string, unknown>): string {
  const sorted = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${String(v)}`)
    .join('&');
  return buildKey('browse', sorted);
}

export function buildDetailKey(slug: string): string {
  return buildKey('detail', slug);
}

export function buildCategoriesKey(): string {
  return buildKey('categories');
}

export function buildFeaturedKey(): string {
  return buildKey('featured');
}

export function buildIconKey(slug: string): string {
  return buildKey('icon', slug);
}

export function buildUserInstallsKey(userId: string): string {
  return buildKey('user-installs', userId);
}

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedis();
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function setCached(
  key: string,
  data: unknown,
  type: keyof typeof TTL = 'browse',
): Promise<void> {
  try {
    const redis = getRedis();
    await redis.set(key, JSON.stringify(data), 'EX', TTL[type]);
  } catch {
    // Best-effort caching
  }
}

export async function invalidateListing(slug: string): Promise<void> {
  try {
    const redis = getRedis();
    await redis.del(buildDetailKey(slug));
    await invalidateCatalog();
  } catch {
    // Best-effort
  }
}

export async function invalidateCatalog(): Promise<void> {
  try {
    const redis = getRedis();
    // Increment search version to invalidate all browse cache keys
    await redis.incr(buildKey('search-version'));
    await redis.del(buildFeaturedKey());
    await redis.del(buildCategoriesKey());
  } catch {
    // Best-effort
  }
}

export async function invalidateUserInstalls(userId: string): Promise<void> {
  try {
    const redis = getRedis();
    await redis.del(buildUserInstallsKey(userId));
  } catch {
    // Best-effort
  }
}

export async function getSearchVersion(): Promise<number> {
  try {
    const redis = getRedis();
    const val = await redis.get(buildKey('search-version'));
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}
