"use client";

import { useUser } from "@clerk/nextjs";
import { Badge, Skeleton } from "@apifold/ui";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import {
  Zap,
  Sparkles,
  Crown,
  Building2,
  Server,
  Activity,
  Clock,
} from "lucide-react";

const PLAN_UI = {
  free: { price: "€0/mo", icon: Zap, badge: "default" as const },
  starter: { price: "€9/mo", icon: Sparkles, badge: "info" as const },
  pro: { price: "€29/mo", icon: Crown, badge: "success" as const },
  enterprise: { price: "Custom", icon: Building2, badge: "info" as const },
} as const;

function formatLimit(value: number): string {
  if (!Number.isFinite(value)) return "∞";
  if (value >= 1_000_000) return `${value / 1_000_000}M`;
  if (value >= 1_000) return `${value / 1_000}K`;
  return String(value);
}

function formatRetention(days: number): string {
  if (!Number.isFinite(days)) return "∞";
  return `${days} days`;
}

export function PlanBanner() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <Skeleton className="mb-4 h-5 w-32 rounded-lg" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
    );
  }

  const planId = ((user?.publicMetadata?.plan as string) || "free") as PlanId;
  const plan = PLANS[planId] ?? PLANS.free;
  const ui = PLAN_UI[planId] ?? PLAN_UI.free;
  const PlanIcon = ui.icon;

  return (
    <div className="rounded-xl border border-border bg-card p-6 h-full">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Current Plan
        </h2>
        <Badge variant={ui.badge} className="text-xs gap-1">
          <PlanIcon className="h-3 w-3" />
          {plan.name} — {ui.price}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-surface-2 p-3.5 text-center">
          <Server className="mx-auto mb-1.5 h-4 w-4 text-muted-foreground" />
          <p className="text-xl font-bold font-heading tabular-nums">
            {formatLimit(plan.maxServers)}
          </p>
          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
            Servers
          </p>
        </div>
        <div className="rounded-lg bg-surface-2 p-3.5 text-center">
          <Activity className="mx-auto mb-1.5 h-4 w-4 text-muted-foreground" />
          <p className="text-xl font-bold font-heading tabular-nums">
            {formatLimit(plan.maxRequestsPerMonth)}
          </p>
          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
            Requests/mo
          </p>
        </div>
        <div className="rounded-lg bg-surface-2 p-3.5 text-center">
          <Clock className="mx-auto mb-1.5 h-4 w-4 text-muted-foreground" />
          <p className="text-xl font-bold font-heading tabular-nums">
            {formatRetention(plan.logRetentionDays)}
          </p>
          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
            Log Retention
          </p>
        </div>
      </div>
    </div>
  );
}
