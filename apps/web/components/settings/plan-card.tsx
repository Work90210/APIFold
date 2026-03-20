"use client";

import { cn, Badge, Skeleton } from "@apifold/ui";
import { useUsage, useSpecs } from "@/lib/hooks";

const SERVER_LIMIT = 10;

export function PlanCard() {
  const { data: usage, isLoading: usageLoading } = useUsage();
  const { data: specs, isLoading: specsLoading } = useSpecs();

  if (usageLoading || specsLoading) {
    return (
      <div className="rounded-xl bg-card shadow-sm p-6">
        <Skeleton className="mb-6 h-5 w-32 rounded-lg" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  const serverCount = usage?.serverCount ?? 0;
  const usagePercent = Math.min((serverCount / SERVER_LIMIT) * 100, 100);

  return (
    <div className="rounded-xl bg-card shadow-sm p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-fluid-xl font-semibold font-heading tracking-tight text-muted-foreground">
          Plan &amp; Usage
        </h2>
        <Badge
          variant="info"
          className="text-xs"
        >
          Free Tier
        </Badge>
      </div>

      {/* Usage progress */}
      <div className="mt-6 space-y-2">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground leading-normal">
            Servers
          </span>
          <span className="font-semibold tabular-nums">
            {serverCount.toLocaleString()}{" "}
            <span className="font-normal text-muted-foreground">
              / {SERVER_LIMIT.toLocaleString()}
            </span>
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full animate-progress",
              usagePercent >= 90
                ? "bg-destructive"
                : usagePercent >= 70
                  ? "bg-amber-500"
                  : "bg-foreground",
            )}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      </div>

      <div className="border-t border-border/40 mt-6" />

      {/* Stats */}
      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Specs</dt>
          <dd className="font-semibold tabular-nums">
            {specs?.length ?? 0}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Servers</dt>
          <dd className="font-semibold tabular-nums">
            {serverCount}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Active Servers</dt>
          <dd className="font-semibold tabular-nums">
            {usage?.activeServers ?? 0}
          </dd>
        </div>
      </dl>
    </div>
  );
}
