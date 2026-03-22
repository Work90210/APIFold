"use client";

import { useState, use } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Activity, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@apifold/ui";
import { useAnalytics, type TimeRange } from "@/lib/hooks/use-analytics";
import { cn } from "@apifold/ui";

export default function AnalyticsPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = use(params);
  const [range, setRange] = useState<TimeRange>("7d");
  const { data, isLoading } = useAnalytics(id, range);

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        No analytics data available yet.
      </div>
    );
  }

  const { overview, topTools } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Analytics Overview</h2>
        <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
          {(["24h", "7d", "30d"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium transition-all",
                range === r
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Calls"
          value={overview.totalCalls.toLocaleString()}
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Success Rate"
          value={`${overview.successRate.toFixed(1)}%`}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
        />
        <StatCard
          title="Avg Latency"
          value={`${overview.avgLatencyMs}ms`}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Errors"
          value={overview.errorCount.toLocaleString()}
          icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-medium text-muted-foreground">
            Call Volume by Tool
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[...topTools]}>
                <XAxis
                  dataKey="name"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "none",
                    borderRadius: "8px",
                  }}
                  itemStyle={{ color: "#f3f4f6" }}
                />
                <Line
                  type="monotone"
                  dataKey="calls"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-medium text-muted-foreground">
            Top Tools
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...topTools]} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={120}
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "none",
                    borderRadius: "8px",
                  }}
                />
                <Bar
                  dataKey="calls"
                  fill="#8b5cf6"
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Latency Distribution */}
      <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
        <h3 className="mb-6 text-sm font-medium text-muted-foreground">
          Latency Percentiles
        </h3>
        <div className="grid gap-6 md:grid-cols-3">
          <LatencyBar label="P50" value={overview.p50Ms} max={overview.p99Ms || 1} />
          <LatencyBar label="P95" value={overview.p95Ms} max={overview.p99Ms || 1} />
          <LatencyBar
            label="P99"
            value={overview.p99Ms}
            max={overview.p99Ms || 1}
            isHigh
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  readonly title: string;
  readonly value: string;
  readonly icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between pb-2">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function LatencyBar({
  label,
  value,
  max,
  isHigh,
}: {
  readonly label: string;
  readonly value: number;
  readonly max: number;
  readonly isHigh?: boolean;
}) {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium">{value}ms</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "h-full transition-all duration-500 ease-in-out",
            isHigh ? "bg-red-500" : "bg-emerald-500",
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-36" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-[350px] rounded-xl" />
        <Skeleton className="h-[350px] rounded-xl" />
      </div>
      <Skeleton className="h-[130px] rounded-xl" />
    </div>
  );
}
