"use client";

import { FileJson, Server, Zap, Activity } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@apifold/ui";
import { useSpecs, useUsage } from "@/lib/hooks";
import { Sparkline } from "@/components/dashboard/sparkline";

function StatSkeleton() {
  return (
    <div className="rounded-xl bg-card shadow-sm p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-5 rounded" />
      </div>
      <Skeleton className="mt-4 h-9 w-20" />
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  index,
  trend,
}: {
  readonly title: string;
  readonly value: number;
  readonly icon: LucideIcon;
  readonly index: number;
  readonly trend: readonly number[];
}) {
  return (
    <div
      className="rounded-xl bg-card shadow-sm p-6 animate-stagger-in"
      style={{ "--i": index } as React.CSSProperties}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {title}
        </span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div
        className="mt-3 text-3xl font-semibold tabular-nums tracking-tight animate-value"
        style={{ "--i": index } as React.CSSProperties}
      >
        {value.toLocaleString()}
      </div>
      <div className="mt-3">
        <Sparkline data={trend} color="var(--color-muted-foreground)" height={32} width={100} />
      </div>
    </div>
  );
}

export function StatsRow() {
  const { data: specs, status: specsStatus, fetchStatus: specsFetchStatus } = useSpecs();
  const { data: usage, status: usageStatus, fetchStatus: usageFetchStatus } = useUsage();

  const showSkeleton =
    (specsStatus === "pending" && specsFetchStatus === "fetching") ||
    (usageStatus === "pending" && usageFetchStatus === "fetching");

  if (showSkeleton) {
    return (
      <div className="grid-auto-fill gap-5">
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
      </div>
    );
  }

  const totalSpecs = specs?.length ?? 0;
  const activeServers = usage?.activeServers ?? 0;
  const totalTools = specs?.reduce((sum, spec) => sum + spec.toolCount, 0) ?? 0;
  const totalServers = usage?.serverCount ?? 0;

  const stats = [
    {
      title: "Total Specs",
      value: totalSpecs,
      icon: FileJson,
      trend: [3, 5, 4, 7, 6, 8, 9],
    },
    {
      title: "Active Servers",
      value: activeServers,
      icon: Server,
      trend: [2, 3, 2, 4, 3, 5, 4],
    },
    {
      title: "Tools Exposed",
      value: totalTools,
      icon: Zap,
      trend: [5, 8, 6, 10, 9, 12, 11],
    },
    {
      title: "Total Servers",
      value: totalServers,
      icon: Activity,
      trend: [120, 180, 150, 220, 200, 280, 310],
    },
  ];

  return (
    <div className="grid-auto-fill gap-5">
      {stats.map((stat, index) => (
        <StatCard key={stat.title} {...stat} index={index} />
      ))}
    </div>
  );
}
