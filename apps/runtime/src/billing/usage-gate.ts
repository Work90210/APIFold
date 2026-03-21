import type { Redis } from 'ioredis';
import type { Logger } from '../observability/logger.js';

export interface PlanLimits {
  readonly maxRequestsPerMonth: number;
  readonly overageRate: number;
  readonly budgetCapCents: number | null;
}

export interface UsageGateResult {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly currentUsage: number;
  readonly limit: number;
}

export interface UsageGateDeps {
  readonly redis: Redis;
  readonly logger: Logger;
}

function getUsageKey(userId: string): string {
  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  return `usage:${userId}:${month}`;
}

/**
 * Check if a tool execution is allowed, then increment usage atomically.
 * This runs in the MCP runtime on every tools/call request.
 */
export async function checkAndIncrementUsage(
  deps: UsageGateDeps,
  userId: string,
  planLimits: PlanLimits,
): Promise<UsageGateResult> {
  const { redis, logger } = deps;
  const key = getUsageKey(userId);

  // Guard against Infinity — use MAX_SAFE_INTEGER as "unlimited"
  const maxReq = Number.isFinite(planLimits.maxRequestsPerMonth)
    ? planLimits.maxRequestsPerMonth
    : Number.MAX_SAFE_INTEGER;

  try {
    const result = await redis.eval(
      `
      local key = KEYS[1]
      local limit = tonumber(ARGV[1])
      local hardCap = tonumber(ARGV[2])
      local hasBudgetCap = tonumber(ARGV[3])
      local budgetCap = tonumber(ARGV[4])
      local overageRate = tonumber(ARGV[5])

      local current = tonumber(redis.call('GET', key) or '0')

      -- Hard cap for free tier (overageRate == 0 means no overage allowed)
      if hardCap == 1 and current >= limit then
        return { 0, current, limit }
      end

      -- Budget cap check for paid tiers (>= to catch the first overage request)
      if hasBudgetCap == 1 and current >= limit then
        local overageRequests = current - limit
        local overageCostCents = overageRequests * overageRate * 100
        if overageCostCents >= budgetCap then
          return { 0, current, limit }
        end
      end

      -- Increment
      local newCount = redis.call('INCR', key)
      redis.call('EXPIRE', key, 3024000) -- 35 days
      return { 1, newCount, limit }
      `,
      1,
      key,
      maxReq,
      planLimits.overageRate === 0 ? 1 : 0,
      planLimits.budgetCapCents !== null ? 1 : 0,
      planLimits.budgetCapCents ?? 0,
      planLimits.overageRate,
    ) as [number, number, number];

    const [allowed, currentUsage, limit] = result;

    if (!allowed) {
      logger.warn(
        { userId, currentUsage, limit },
        'Usage limit reached — request blocked',
      );
    }

    return Object.freeze({
      allowed: allowed === 1,
      reason: allowed === 1 ? undefined : 'Usage limit reached',
      currentUsage,
      limit,
    });
  } catch (err) {
    logger.error({ err, userId }, 'Usage gate check failed');

    // Fail closed for users with a budget cap (protect their spending limit)
    // Fail open for everyone else (availability over accuracy)
    if (planLimits.budgetCapCents !== null) {
      return Object.freeze({
        allowed: false,
        reason: 'Usage gate unavailable — requests paused to protect spending limit',
        currentUsage: 0,
        limit: maxReq,
      });
    }

    return Object.freeze({
      allowed: true,
      currentUsage: 0,
      limit: maxReq,
    });
  }
}

/**
 * Get plan limits for a user from Redis cache.
 * The web app stores plan info in Clerk metadata, which is synced to Redis
 * by the webhook handler. Falls back to free tier limits.
 */
export async function getPlanLimitsForUser(
  redis: Redis,
  userId: string,
): Promise<PlanLimits> {
  try {
    const planData = await redis.get(`plan:${userId}`);
    if (planData) {
      return JSON.parse(planData) as PlanLimits;
    }
  } catch {
    // Fall through to defaults
  }

  // Default: free tier limits
  return Object.freeze({
    maxRequestsPerMonth: 1_000,
    overageRate: 0,
    budgetCapCents: null,
  });
}
