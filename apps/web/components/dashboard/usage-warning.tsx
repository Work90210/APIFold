"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useUsage } from "@/lib/hooks";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { AlertTriangle, ArrowRight } from "lucide-react";

export function UsageWarning() {
  const { user } = useUser();
  const { data: usage } = useUsage();

  if (!usage || !user) return null;

  const planId = ((user.publicMetadata?.plan as string) || "free") as PlanId;
  const plan = PLANS[planId] ?? PLANS.free;

  const serverPercent = Number.isFinite(plan.maxServers)
    ? (usage.serverCount / plan.maxServers) * 100
    : 0;
  const requestPercent = Number.isFinite(plan.maxRequestsPerMonth)
    ? (usage.requestsThisMonth / plan.maxRequestsPerMonth) * 100
    : 0;

  const highestPercent = Math.max(serverPercent, requestPercent);

  if (highestPercent < 80) return null;

  const isAtLimit = highestPercent >= 100;
  const resource = requestPercent >= serverPercent ? "request" : "server";

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm flex items-center gap-3 ${
        isAtLimit
          ? "border-destructive/30 bg-destructive/[0.05] text-destructive"
          : "border-amber-500/30 bg-amber-500/[0.05] text-amber-600 dark:text-amber-400"
      }`}
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        {isAtLimit
          ? `You've reached your ${resource} limit. ${planId === "free" ? "Requests are being rejected (429)." : "Overage charges apply."}`
          : `You've used ${Math.round(highestPercent)}% of your ${resource} quota this month.`}
      </span>
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-1 font-medium underline underline-offset-2 hover:no-underline shrink-0"
      >
        {planId === "free" ? "Upgrade" : "View usage"}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
