import { getDb } from "@/lib/db";
import { mcpServers } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getMonthlyUsage } from "./usage-tracker";
import type { Plan } from "./plans";

export interface ServerLimitResult {
  readonly allowed: boolean;
  readonly current: number;
  readonly max: number;
}

export interface RequestLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly current: number;
  readonly max: number;
}

export async function checkServerLimit(
  userId: string,
  plan: Plan,
): Promise<ServerLimitResult> {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mcpServers)
    .where(and(eq(mcpServers.userId, userId), eq(mcpServers.isActive, true)));

  const current = row?.count ?? 0;

  return Object.freeze({
    allowed: current < plan.maxServers,
    current,
    max: plan.maxServers,
  });
}

export async function checkRequestLimit(
  userId: string,
  plan: Plan,
): Promise<RequestLimitResult> {
  const current = await getMonthlyUsage(userId);
  const remaining = Math.max(0, plan.maxRequestsPerMonth - current);

  return Object.freeze({
    allowed: current < plan.maxRequestsPerMonth,
    remaining,
    current,
    max: plan.maxRequestsPerMonth,
  });
}
