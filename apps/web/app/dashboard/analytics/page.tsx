"use client";

import { useState, useId } from "react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  BarChart3,
  Server,
} from "lucide-react";
import { Skeleton, EmptyState } from "@apifold/ui";
import { cn } from "@apifold/ui";
import { useServers } from "@/lib/hooks";
import { useAnalytics, type TimeRange } from "@/lib/hooks/use-analytics";

const RANGE_LABELS: Record<TimeRange, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

export default function AnalyticsPage() {
  const [range, setRange] = useState<TimeRange>("7d");
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const { data: servers, isLoading: serversLoading } = useServers();

  const serverId = selectedServerId ?? servers?.[0]?.id ?? "";
  const selectedServer = servers?.find((s) => s.id === serverId);

  const { data, isLoading: analyticsLoading } = useAnalytics(serverId, range);
  const isLoading = serversLoading || (!!serverId && analyticsLoading);

  return (
    <div className="animate-in">
      {/* Header — left-aligned, no icon badge */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-fluid-3xl font-bold font-heading tracking-tight">
            Analytics
          </h1>
          {selectedServer && (
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedServer.name}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Server className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <select
              value={serverId}
              onChange={(e) => setSelectedServerId(e.target.value)}
              className="appearance-none rounded-md border border-border bg-card text-foreground pl-9 pr-8 py-1.5 text-sm transition-colors hover:border-input focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {serversLoading && <option>Loading...</option>}
              {servers?.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>

          <div className="flex items-center rounded-md border border-border p-0.5">
            {(["24h", "7d", "30d"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                aria-label={RANGE_LABELS[r]}
                aria-pressed={range === r}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  range === r
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8">
        {!serverId || (!servers?.length && !serversLoading) ? (
          <EmptyState
            icon={BarChart3}
            title="No servers yet"
            description="Create an MCP server to start seeing analytics."
          />
        ) : isLoading ? (
          <AnalyticsSkeleton />
        ) : !data || data.overview.totalCalls === 0 ? (
          <EmptyAnalytics serverName={selectedServer?.name ?? "this server"} range={range} />
        ) : (
          <AnalyticsDashboard data={data} range={range} />
        )}
      </div>
    </div>
  );
}

function AnalyticsDashboard({
  data,
  range,
}: {
  readonly data: NonNullable<ReturnType<typeof useAnalytics>["data"]>;
  readonly range: TimeRange;
}) {
  const { overview, topTools, toolBreakdown } = data;
  const gradientId = useId();

  return (
    <div>
      {/* Key metrics — not cards, just numbers with breathing room */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-6 lg:grid-cols-4">
        <Metric
          label="Total calls"
          value={overview.totalCalls.toLocaleString()}
          detail={RANGE_LABELS[range]}
        />
        <Metric
          label="Success rate"
          value={`${overview.successRate.toFixed(1)}%`}
          detail={`${overview.successCount.toLocaleString()} OK`}
          color={overview.successRate >= 95 ? "text-status-success" : "text-status-warning"}
        />
        <Metric
          label="Avg latency"
          value={`${overview.avgLatencyMs}ms`}
          detail={`p95 ${overview.p95Ms}ms`}
        />
        <Metric
          label="Errors"
          value={overview.errorCount.toLocaleString()}
          detail={`${(100 - overview.successRate).toFixed(1)}% rate`}
          color={overview.errorCount > 0 ? "text-status-error" : undefined}
        />
      </div>

      {/* Charts — separated by generous whitespace, not cards */}
      <div className="mt-12 grid gap-12 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Call volume</h2>
            <span className="text-xs text-muted-foreground">by tool</span>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[...topTools]}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(243, 96%, 67%)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(243, 96%, 67%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 20%, 31%, 0.3)" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="hsl(226, 20%, 70%)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dy={8}
                />
                <YAxis
                  stroke="hsl(226, 20%, 70%)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dx={-8}
                />
                <Tooltip
                  cursor={{ stroke: "hsl(243, 96%, 67%, 0.15)", strokeWidth: 1 }}
                  contentStyle={{
                    backgroundColor: "hsl(222, 40%, 10%)",
                    border: "1px solid hsl(225, 20%, 31%)",
                    borderRadius: "6px",
                    padding: "8px 12px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "hsl(226, 20%, 70%)", marginBottom: "2px" }}
                  itemStyle={{ color: "hsl(226, 100%, 93%)" }}
                />
                <Area
                  type="monotone"
                  dataKey="calls"
                  stroke="hsl(243, 96%, 67%)"
                  strokeWidth={1.5}
                  fill={`url(#${gradientId})`}
                  dot={false}
                  activeDot={{ r: 3, fill: "hsl(243, 96%, 67%)", strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="mb-3">
            <h2 className="text-sm font-medium text-muted-foreground">Top tools</h2>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...topTools]} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={100}
                  stroke="hsl(226, 20%, 70%)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "hsl(243, 96%, 67%, 0.04)" }}
                  contentStyle={{
                    backgroundColor: "hsl(222, 40%, 10%)",
                    border: "1px solid hsl(225, 20%, 31%)",
                    borderRadius: "6px",
                    padding: "8px 12px",
                    fontSize: "12px",
                  }}
                  itemStyle={{ color: "hsl(226, 100%, 93%)" }}
                />
                <Bar
                  dataKey="calls"
                  fill="hsl(243, 96%, 67%)"
                  radius={[0, 3, 3, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Latency + breakdown — asymmetric */}
      <div className="mt-12 grid gap-12 lg:grid-cols-3">
        <div>
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">Latency percentiles</h2>
          <div className="space-y-4">
            <LatencyRow label="p50" value={overview.p50Ms} max={overview.p99Ms || 1} color="bg-status-success" />
            <LatencyRow label="p95" value={overview.p95Ms} max={overview.p99Ms || 1} color="bg-status-warning" />
            <LatencyRow label="p99" value={overview.p99Ms} max={overview.p99Ms || 1} color="bg-status-error" />
          </div>
        </div>

        {toolBreakdown.length > 0 && (
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-sm font-medium text-muted-foreground">Per-tool breakdown</h2>
            <div className="border-t border-border/50">
              {toolBreakdown.map((tool, i) => (
                <div
                  key={tool.toolId ?? tool.name}
                  className={cn(
                    "flex items-center justify-between py-2.5",
                    i < toolBreakdown.length - 1 && "border-b border-border/30",
                  )}
                >
                  <span className="text-sm font-medium">{tool.name}</span>
                  <div className="flex items-center gap-6 text-sm tabular-nums text-muted-foreground">
                    <span>{tool.calls.toLocaleString()} calls</span>
                    <span className="font-mono w-16 text-right">{tool.avgMs}ms</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  color,
}: {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
  readonly color?: string;
}) {
  return (
    <div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className={cn("mt-1 text-2xl font-bold tabular-nums tracking-tight", color)}>
        {value}
      </div>
      <span className="text-xs text-muted-foreground">{detail}</span>
    </div>
  );
}

function LatencyRow({
  label,
  value,
  max,
  color,
}: {
  readonly label: string;
  readonly value: number;
  readonly max: number;
  readonly color: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-mono tabular-nums">{value}ms</span>
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out-expo", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function EmptyAnalytics({
  serverName,
  range,
}: {
  readonly serverName: string;
  readonly range: TimeRange;
}) {
  return (
    <div className="py-16 text-center">
      <Activity className="mx-auto h-8 w-8 text-muted-foreground/50" />
      <h3 className="mt-3 text-sm font-semibold">No data yet</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
        No calls recorded for {serverName} in the {RANGE_LABELS[range].toLowerCase()}.
      </p>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`metric-${i}`} className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="mt-12 grid gap-12 lg:grid-cols-5">
        <Skeleton className="lg:col-span-3 h-[280px]" />
        <Skeleton className="lg:col-span-2 h-[280px]" />
      </div>
    </div>
  );
}
