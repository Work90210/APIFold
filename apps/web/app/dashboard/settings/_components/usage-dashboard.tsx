"use client";

import { Skeleton } from "@apifold/ui";
import { useUsage, useSpecs } from "@/lib/hooks";
import { useUser } from "@clerk/nextjs";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { Server, Activity } from "lucide-react";
import { UsageMeter } from "./usage-meter";

function getOverageLabel(planId: PlanId): string {
  if (planId === "free") return "Hard cap (429)";
  if (planId === "enterprise") return "N/A";
  return "€0.50 / 10K requests";
}

export function UsageDashboard() {
  const { user } = useUser();
  const { data: usage, isLoading: usageLoading } = useUsage();
  const { data: specs, isLoading: specsLoading } = useSpecs();

  if (usageLoading || specsLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <Skeleton className="mb-4 h-5 w-40 rounded-lg" />
        <div className="space-y-6">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
      </div>
    );
  }

  const planId = ((user?.publicMetadata?.plan as string) || "free") as PlanId;
  const plan = PLANS[planId] ?? PLANS.free;

  const now = new Date();
  const billingPeriod = now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Usage This Month
        </h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          {billingPeriod}
        </span>
      </div>

      <div className="space-y-6">
        <UsageMeter
          label="MCP Servers"
          icon={Server}
          current={usage?.serverCount ?? 0}
          max={plan.maxServers}
        />
        <UsageMeter
          label="API Requests"
          icon={Activity}
          current={usage?.requestsThisMonth ?? 0}
          max={plan.maxRequestsPerMonth}
        />
      </div>

      <div className="border-t border-border/40 mt-6" />

      <dl className="mt-5 grid grid-cols-2 gap-y-3 gap-x-8 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Specs imported</dt>
          <dd className="font-semibold tabular-nums">{specs?.length ?? 0}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Active servers</dt>
          <dd className="font-semibold tabular-nums">
            {usage?.activeServers ?? 0}
          </dd>
        </div>
        <div className="flex justify-between col-span-2 sm:col-span-1">
          <dt className="text-muted-foreground">Overage policy</dt>
          <dd className="font-semibold text-right">{getOverageLabel(planId)}</dd>
        </div>
      </dl>
    </div>
  );
}
