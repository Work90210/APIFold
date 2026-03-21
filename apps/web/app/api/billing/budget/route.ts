import { NextResponse } from "next/server";
import {
  getUserId,
  getUserPlan,
  withErrorHandler,
  withRateLimit,
} from "@/lib/api-helpers";
import { createSuccessResponse } from "@apifold/types";
import { getRedis } from "@/lib/redis";
import { z } from "zod";

const budgetSchema = z.object({
  capEur: z.number().min(0).max(10_000).multipleOf(0.01).nullable(),
});

const BUDGET_KEY_PREFIX = "budget:cap:";
const PLAN_CACHE_TTL = 30 * 24 * 60 * 60;

export function GET(_request: Request) {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const redis = getRedis();
    const value = await redis.get(`${BUDGET_KEY_PREFIX}${userId}`);
    const raw = value ? parseInt(value, 10) : null;
    const capCents = raw !== null && Number.isFinite(raw) ? raw : null;

    return NextResponse.json(
      createSuccessResponse({
        capEur: capCents !== null ? capCents / 100 : null,
      }),
    );
  });
}

export function POST(request: Request) {
  return withErrorHandler(async () => {
    const userId = await getUserId();
    const rateLimited = await withRateLimit(userId);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const { capEur } = budgetSchema.parse(body);

    const redis = getRedis();
    const budgetKey = `${BUDGET_KEY_PREFIX}${userId}`;
    const planKey = `plan:${userId}`;
    const capCents = capEur !== null ? Math.round(capEur * 100) : null;

    // Update or create the plan limits cache so the runtime picks it up
    const plan = await getUserPlan(userId);
    const maxReq = Number.isFinite(plan.maxRequestsPerMonth)
      ? plan.maxRequestsPerMonth
      : Number.MAX_SAFE_INTEGER;

    const limits = JSON.stringify({
      maxRequestsPerMonth: maxReq,
      overageRate: plan.overageRate,
      budgetCapCents: capCents,
    });

    // Atomically update budget cap key and plan cache in a single pipeline
    const pipeline = redis.pipeline();
    if (capCents === null) {
      pipeline.del(budgetKey);
    } else {
      pipeline.set(budgetKey, capCents.toString());
    }
    pipeline.set(planKey, limits, "EX", PLAN_CACHE_TTL);
    await pipeline.exec();

    return NextResponse.json(createSuccessResponse({ capEur }));
  });
}
