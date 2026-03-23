"use client";

import { Skeleton } from "@apifold/ui";
import { useSpecs, useUsage } from "@/lib/hooks";

export function StatsRow() {
  const { data: specs, status: specsStatus, fetchStatus: specsFetchStatus } = useSpecs();
  const { data: usage, status: usageStatus, fetchStatus: usageFetchStatus } = useUsage();

  const isLoading =
    (specsStatus === "pending" && specsFetchStatus === "fetching") ||
    (usageStatus === "pending" && usageFetchStatus === "fetching");

  const totalSpecs = specs?.length ?? 0;
  const activeServers = usage?.activeServers ?? 0;
  const totalTools = specs?.reduce((sum, spec) => sum + spec.toolCount, 0) ?? 0;
  const totalServers = usage?.serverCount ?? 0;

  const stats = [
    { label: "Specs", value: totalSpecs },
    { label: "Active Servers", value: activeServers },
    { label: "Tools", value: totalTools },
    { label: "Total Servers", value: totalServers },
  ];

  return (
    <div className="flex items-center gap-6 border-b border-border pb-4">
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-baseline gap-2">
          <span className="text-xl font-semibold tabular-nums tracking-tight">
            {isLoading ? <Skeleton className="inline-block h-6 w-8" /> : stat.value}
          </span>
          <span className="text-sm text-muted-foreground">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}
