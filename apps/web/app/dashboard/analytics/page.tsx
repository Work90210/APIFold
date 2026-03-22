"use client";

import { useState } from "react";
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
import {
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  BarChart3,
} from "lucide-react";
import { Skeleton, EmptyState } from "@apifold/ui";
import { cn } from "@apifold/ui";
import { useServers } from "@/lib/hooks";
import { useAnalytics, type TimeRange } from "@/lib/hooks/use-analytics";

export default function AnalyticsPage() {
  const [range, setRange] = useState<TimeRange>("7d");
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const { data: servers, isLoading: serversLoading } = useServers();

  // Auto-select first server if none selected
  const serverId = selectedServerId ?? servers?.[0]?.id ?? "";
  const selectedServer = servers?.find((s) => s.id === serverId);

  const { data, isLoading: analyticsLoading } = useAnalytics(
    serverId,
    range,
  );

  const isLoading = serversLoading || (serverId && analyticsLoading);

  return (
    <div className="space-y-6 animate-in">
      {/* Header with server filter and time range */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-fluid-3xl font-bold font-heading tracking-tight">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor performance across your MCP servers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Server filter */}
          <div className="relative">
            <select
              value={serverId}
              onChange={(e) => setSelectedServerId(e.target.value)}
              className="appearance-none rounded-lg border border-border bg-card px-4 py-2 pr-8 text-sm font-medium transition-colors hover:border-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring"
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
          <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
            {(["24h", "7d", "30d"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
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
      </div>

      <div className="border-t border-border/40" />

      {/* Content */}
      {!serverId || (!servers?.length && !serversLoading) ? (
        <div className="rounded-xl bg-card p-12 shadow-sm">
          <EmptyState
            icon={BarChart3}
            title="No servers yet"
            description="Create an MCP server to start seeing analytics."
          />
        </div>
      ) : isLoading ? (
        <AnalyticsSkeleton />
      ) : !data ? (
        <div className="rounded-xl bg-card p-12 shadow-sm">
          <EmptyState
            icon={Activity}
            title="No data yet"
            description={`No tool calls recorded for ${selectedServer?.name ?? "this server"} in the last ${range}.`}
          />
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Calls"
              value={data.overview.totalCalls.toLocaleString()}
              icon={<Activity className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard
              title="Success Rate"
              value={`${data.overview.successRate.toFixed(1)}%`}
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
            />
            <StatCard
              title="Avg Latency"
              value={`${data.overview.avgLatencyMs}ms`}
              icon={<Clock className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard
              title="Errors"
              value={data.overview.errorCount.toLocaleString()}
              icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
            />
          </div>

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-medium text-muted-foreground">
                Call Volume by Tool
              </h3>
              {data.topTools.length > 0 ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[...data.topTools]}>
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
              ) : (
                <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                  No tool call data yet
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-medium text-muted-foreground">
                Top Tools
              </h3>
              {data.topTools.length > 0 ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[...data.topTools]} layout="vertical">
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
              ) : (
                <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                  No tool call data yet
                </div>
              )}
            </div>
          </div>

          {/* Latency Percentiles */}
          <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
            <h3 className="mb-6 text-sm font-medium text-muted-foreground">
              Latency Percentiles
            </h3>
            <div className="grid gap-6 md:grid-cols-3">
              <LatencyBar
                label="P50"
                value={data.overview.p50Ms}
                max={data.overview.p99Ms || 1}
              />
              <LatencyBar
                label="P95"
                value={data.overview.p95Ms}
                max={data.overview.p99Ms || 1}
              />
              <LatencyBar
                label="P99"
                value={data.overview.p99Ms}
                max={data.overview.p99Ms || 1}
                isHigh
              />
            </div>
          </div>

          {/* Tool Breakdown Table */}
          {data.toolBreakdown.length > 0 && (
            <div className="rounded-xl border border-border/50 bg-card shadow-sm">
              <div className="p-6 pb-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Per-Tool Breakdown
                </h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-b">
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                      Tool
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                      Calls
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                      Avg Latency
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.toolBreakdown.map((tool) => (
                    <tr
                      key={tool.toolId ?? tool.name}
                      className="border-b last:border-0 transition-colors hover:bg-muted/50"
                    >
                      <td className="px-6 py-3 font-medium">{tool.name}</td>
                      <td className="px-6 py-3 tabular-nums">
                        {tool.calls.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 font-mono tabular-nums">
                        {tool.avgMs}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
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
        <span className="text-sm font-medium text-muted-foreground">
          {title}
        </span>
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
