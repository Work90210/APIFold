"use client";

import { useState } from "react";
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
  TrendingUp,
  TrendingDown,
  Zap,
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

  const isLoading = serversLoading || (serverId && analyticsLoading);

  return (
    <div className="space-y-8 animate-in">
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 ring-1 ring-violet-500/20">
              <BarChart3 className="h-5 w-5 text-violet-400" />
            </div>
            <h1 className="text-fluid-3xl font-bold font-heading tracking-tight">
              Analytics
            </h1>
          </div>
          <p className="text-sm text-muted-foreground pl-[52px]">
            {selectedServer
              ? `Performance metrics for ${selectedServer.name}`
              : "Monitor performance across your MCP servers"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Server filter */}
          <div className="relative">
            <Server className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={serverId}
              onChange={(e) => setSelectedServerId(e.target.value)}
              className="appearance-none rounded-lg border border-border/60 bg-card/80 backdrop-blur-sm pl-9 pr-9 py-2 text-sm font-medium transition-all hover:border-border focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50"
            >
              {serversLoading && <option>Loading...</option>}
              {servers?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>

          {/* Time range */}
          <div className="flex items-center rounded-lg border border-border/60 bg-card/80 backdrop-blur-sm p-0.5">
            {(["24h", "7d", "30d"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                  range === r
                    ? "bg-violet-500/15 text-violet-300 shadow-sm shadow-violet-500/10"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {!serverId || (!servers?.length && !serversLoading) ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 p-16">
          <EmptyState
            icon={BarChart3}
            title="No servers yet"
            description="Create an MCP server to start seeing analytics."
          />
        </div>
      ) : isLoading ? (
        <AnalyticsSkeleton />
      ) : !data || data.overview.totalCalls === 0 ? (
        <EmptyAnalytics serverName={selectedServer?.name ?? "this server"} range={range} />
      ) : (
        <AnalyticsDashboard data={data} range={range} />
      )}
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

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Calls"
          value={overview.totalCalls.toLocaleString()}
          subtitle={RANGE_LABELS[range]}
          icon={Zap}
          iconColor="text-violet-400"
          iconBg="from-violet-500/20 to-violet-600/10"
          ringColor="ring-violet-500/20"
        />
        <StatCard
          title="Success Rate"
          value={`${overview.successRate.toFixed(1)}%`}
          subtitle={`${overview.successCount.toLocaleString()} successful`}
          icon={overview.successRate >= 95 ? TrendingUp : TrendingDown}
          iconColor={overview.successRate >= 95 ? "text-emerald-400" : "text-amber-400"}
          iconBg={overview.successRate >= 95 ? "from-emerald-500/20 to-emerald-600/10" : "from-amber-500/20 to-amber-600/10"}
          ringColor={overview.successRate >= 95 ? "ring-emerald-500/20" : "ring-amber-500/20"}
        />
        <StatCard
          title="Avg Latency"
          value={`${overview.avgLatencyMs}ms`}
          subtitle={`P95: ${overview.p95Ms}ms`}
          icon={Clock}
          iconColor="text-blue-400"
          iconBg="from-blue-500/20 to-blue-600/10"
          ringColor="ring-blue-500/20"
        />
        <StatCard
          title="Errors"
          value={overview.errorCount.toLocaleString()}
          subtitle={`${(100 - overview.successRate).toFixed(1)}% error rate`}
          icon={AlertTriangle}
          iconColor={overview.errorCount > 0 ? "text-red-400" : "text-emerald-400"}
          iconBg={overview.errorCount > 0 ? "from-red-500/20 to-red-600/10" : "from-emerald-500/20 to-emerald-600/10"}
          ringColor={overview.errorCount > 0 ? "ring-red-500/20" : "ring-emerald-500/20"}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Area Chart — wider */}
        <div className="lg:col-span-3 rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Call Volume</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Calls per tool</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-violet-500" />
              Calls
            </div>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[...topTools]}>
                <defs>
                  <linearGradient id="callGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dy={8}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dx={-8}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 15, 20, 0.95)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "10px",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                    padding: "10px 14px",
                  }}
                  itemStyle={{ color: "#e5e7eb", fontSize: "12px" }}
                  labelStyle={{ color: "#9ca3af", fontSize: "11px", marginBottom: "4px" }}
                />
                <Area
                  type="monotone"
                  dataKey="calls"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#callGradient)"
                  dot={{ r: 3, fill: "#8b5cf6", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#8b5cf6", stroke: "#fff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart — narrower */}
        <div className="lg:col-span-2 rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-6">
          <div className="mb-6">
            <h3 className="text-sm font-semibold">Top Tools</h3>
            <p className="text-xs text-muted-foreground mt-0.5">By call count</p>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...topTools]} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={100}
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(139, 92, 246, 0.05)" }}
                  contentStyle={{
                    backgroundColor: "rgba(15, 15, 20, 0.95)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "10px",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                    padding: "10px 14px",
                  }}
                  itemStyle={{ color: "#e5e7eb", fontSize: "12px" }}
                />
                <Bar
                  dataKey="calls"
                  fill="#8b5cf6"
                  radius={[0, 6, 6, 0]}
                  barSize={24}
                  background={{ fill: "rgba(255,255,255,0.02)", radius: 6 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Latency + Tool Breakdown */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Latency Percentiles */}
        <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-6">
          <div className="mb-6">
            <h3 className="text-sm font-semibold">Latency</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Response time percentiles</p>
          </div>
          <div className="space-y-5">
            <LatencyRow label="P50" sublabel="Median" value={overview.p50Ms} max={overview.p99Ms || 1} color="bg-emerald-500" />
            <LatencyRow label="P95" sublabel="Fast" value={overview.p95Ms} max={overview.p99Ms || 1} color="bg-amber-500" />
            <LatencyRow label="P99" sublabel="Slow" value={overview.p99Ms} max={overview.p99Ms || 1} color="bg-red-500" />
          </div>
        </div>

        {/* Tool Breakdown Table */}
        <div className="lg:col-span-2 rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="p-6 pb-0">
            <h3 className="text-sm font-semibold">Tool Breakdown</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Performance by tool</p>
          </div>
          {toolBreakdown.length > 0 ? (
            <div className="mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border/40">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Tool
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Calls
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Avg Latency
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {toolBreakdown.map((tool, i) => (
                    <tr
                      key={tool.toolId ?? tool.name}
                      className={cn(
                        "transition-colors hover:bg-white/[0.02]",
                        i < toolBreakdown.length - 1 && "border-b border-border/20",
                      )}
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-2 w-2 rounded-full bg-violet-500" />
                          <span className="font-medium">{tool.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums text-muted-foreground">
                        {tool.calls.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-right font-mono tabular-nums text-muted-foreground">
                        {tool.avgMs}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              No per-tool data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  iconBg,
  ringColor,
}: {
  readonly title: string;
  readonly value: string;
  readonly subtitle: string;
  readonly icon: typeof Activity;
  readonly iconColor: string;
  readonly iconBg: string;
  readonly ringColor: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-5 transition-all hover:border-border/60 hover:shadow-lg hover:shadow-black/5">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
          <div className="text-3xl font-bold tracking-tight">{value}</div>
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        </div>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ring-1", iconBg, ringColor)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
      </div>
      {/* Subtle glow on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity group-hover:opacity-100 bg-gradient-to-br from-violet-500/[0.03] to-transparent" />
    </div>
  );
}

function LatencyRow({
  label,
  sublabel,
  value,
  max,
  color,
}: {
  readonly label: string;
  readonly sublabel: string;
  readonly value: number;
  readonly max: number;
  readonly color: string;
}) {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold">{label}</span>
          <span className="ml-2 text-xs text-muted-foreground">{sublabel}</span>
        </div>
        <span className="font-mono text-sm font-bold tabular-nums">{value}ms</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", color)}
          style={{ width: `${percentage}%` }}
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
    <div className="rounded-2xl border border-dashed border-border/40 bg-card/30 p-16">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/15 to-violet-600/5 ring-1 ring-violet-500/15">
          <Activity className="h-7 w-7 text-violet-400/70" />
        </div>
        <h3 className="text-lg font-semibold">No data yet</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          No tool calls recorded for <span className="font-medium text-foreground">{serverName}</span> in the {RANGE_LABELS[range].toLowerCase()}.
          Start making MCP tool calls and analytics will appear here.
        </p>
      </div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Skeleton className="lg:col-span-3 h-[360px] rounded-2xl" />
        <Skeleton className="lg:col-span-2 h-[360px] rounded-2xl" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-[240px] rounded-2xl" />
        <Skeleton className="lg:col-span-2 h-[240px] rounded-2xl" />
      </div>
    </div>
  );
}
