"use client";

import { useState, useId, use } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Activity, Circle } from "lucide-react";
import { Skeleton } from "@apifold/ui";
import { cn } from "@apifold/ui";
import {
  useAnalytics,
  type TimeRange,
  type AnalyticsResponse,
} from "@/lib/hooks/use-analytics";

const RANGE_LABELS: Record<TimeRange, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

export default function ServerAnalyticsPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = use(params);
  const [range, setRange] = useState<TimeRange>("7d");
  const { data, isLoading } = useAnalytics(id, range);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Analytics</h1>
        <div className="flex items-center rounded-md border border-border p-0.5">
          {(["24h", "7d", "30d"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              aria-label={RANGE_LABELS[r]}
              aria-pressed={range === r}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors duration-150",
                range === r ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <AnalyticsSkeleton />
      ) : !data || data.overview.totalCalls === 0 ? (
        <EmptyAnalytics range={range} />
      ) : (
        <Dashboard data={data} range={range} />
      )}
    </div>
  );
}

function Dashboard({ data, range }: { readonly data: AnalyticsResponse; readonly range: TimeRange }) {
  const { overview, timeSeries, topTools, errorBreakdown, failingTools, recentActivity, usage } = data;
  const gradientId = useId();

  const chartData = timeSeries.map((p) => {
    const d = new Date(p.bucket);
    const label = range === '24h'
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return { ...p, label };
  });

  return (
    <div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-6 lg:grid-cols-4">
        <Metric label="Total calls" value={overview.totalCalls.toLocaleString()} detail={RANGE_LABELS[range]} />
        <Metric
          label="Success rate"
          value={`${overview.successRate.toFixed(1)}%`}
          detail={`${overview.successCount.toLocaleString()} OK`}
          color={overview.successRate >= 95 ? "text-status-success" : "text-status-warning"}
        />
        <Metric label="Avg latency" value={`${overview.avgLatencyMs}ms`} detail={`p95 ${overview.p95Ms}ms`} />
        <Metric
          label="Errors"
          value={overview.errorCount.toLocaleString()}
          detail={`${(100 - overview.successRate).toFixed(1)}% rate`}
          color={overview.errorCount > 0 ? "text-status-error" : undefined}
        />
      </div>

      {usage.monthlyCallsLimit && (
        <div className="mt-8">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">
              {usage.monthlyCallsUsed.toLocaleString()} / {usage.monthlyCallsLimit.toLocaleString()} calls this month
            </span>
            <span className="font-medium">{usage.planName} plan</span>
          </div>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500 ease-out",
                usage.monthlyCallsUsed / usage.monthlyCallsLimit > 0.9 ? "bg-status-error" : "bg-foreground",
              )}
              style={{ width: `${Math.min((usage.monthlyCallsUsed / usage.monthlyCallsLimit) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-12">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Traffic over time</h2>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-foreground" /> Calls
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-status-error" /> Errors
            </span>
          </div>
        </div>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} dy={8} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} dx={-8} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", padding: "8px 12px", fontSize: "12px" }}
                labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: "4px" }}
                itemStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Area type="monotone" dataKey="calls" stroke="hsl(var(--foreground))" strokeWidth={1.5} fill={`url(#${gradientId})`} dot={false} />
              <Area type="monotone" dataKey="errors" stroke="hsl(var(--status-error))" strokeWidth={1} fill="transparent" dot={false} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-12 grid gap-12 lg:grid-cols-3">
        <div>
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">Top tools</h2>
          <div className="space-y-3">
            {topTools.map((tool) => {
              const pct = topTools[0] ? (tool.calls / topTools[0].calls) * 100 : 0;
              return (
                <div key={tool.name}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium truncate mr-2">{tool.name}</span>
                    <span className="tabular-nums text-muted-foreground shrink-0">{tool.calls}</span>
                  </div>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-foreground transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">Latency percentiles</h2>
          <div className="space-y-4">
            <LatencyRow label="p50" value={overview.p50Ms} max={overview.p99Ms || 1} color="bg-status-success" />
            <LatencyRow label="p95" value={overview.p95Ms} max={overview.p99Ms || 1} color="bg-status-warning" />
            <LatencyRow label="p99" value={overview.p99Ms} max={overview.p99Ms || 1} color="bg-status-error" />
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">
            {errorBreakdown.length > 0 ? "Error breakdown" : "Errors"}
          </h2>
          {errorBreakdown.length > 0 ? (
            <div className="space-y-2">
              {errorBreakdown.map((e) => (
                <div key={`${e.statusCode}-${e.errorCode}`} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-mono font-medium",
                      e.statusCode >= 500 ? "bg-status-error-muted text-status-error" : "bg-status-warning-muted text-status-warning",
                    )}>
                      {e.statusCode}
                    </span>
                    {e.errorCode && <span className="text-muted-foreground text-xs">{e.errorCode}</span>}
                  </div>
                  <span className="tabular-nums text-muted-foreground">{e.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No errors in this period</p>
          )}

          {failingTools.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-xs font-medium text-muted-foreground">Failing tools</h3>
              {failingTools.map((t) => (
                <div key={t.name} className="flex items-center justify-between py-1 text-sm">
                  <span className="truncate mr-2">{t.name}</span>
                  <span className="text-status-error text-xs tabular-nums">{t.errorRate}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-12">
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">Recent activity</h2>
        <div className="border-t border-border">
          {recentActivity.map((call, i) => {
            const isOk = call.status < 400;
            const time = new Date(call.timestamp);
            return (
              <div
                key={`${call.timestamp}-${i}`}
                className={cn("flex items-center justify-between py-2", i < recentActivity.length - 1 && "border-b border-border/50")}
              >
                <div className="flex items-center gap-3">
                  <Circle className={cn("h-2 w-2 fill-current", isOk ? "text-status-success" : "text-status-error")} />
                  <span className="text-sm font-medium">{call.tool}</span>
                  <span className={cn("text-xs font-mono", isOk ? "text-muted-foreground" : "text-status-error")}>{call.status}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="tabular-nums">{call.durationMs}ms</span>
                  <span className="w-14 text-right">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, detail, color }: {
  readonly label: string; readonly value: string; readonly detail: string; readonly color?: string;
}) {
  return (
    <div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className={cn("mt-1 text-xl font-semibold tabular-nums tracking-tight", color)}>{value}</div>
      <span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span>
    </div>
  );
}

function LatencyRow({ label, value, max, color }: {
  readonly label: string; readonly value: number; readonly max: number; readonly color: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-mono tabular-nums">{value}ms</span>
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all duration-500 ease-out", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function EmptyAnalytics({ range }: { readonly range: TimeRange }) {
  return (
    <div className="py-16 text-center">
      <Activity className="mx-auto h-6 w-6 text-muted-foreground/50" />
      <h3 className="mt-3 text-sm font-medium">No data yet</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        No calls recorded in the {RANGE_LABELS[range].toLowerCase()}.
      </p>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`m-${i}`} className="space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-7 w-24" /><Skeleton className="h-3 w-20" /></div>
        ))}
      </div>
      <Skeleton className="mt-12 h-[240px]" />
      <div className="mt-12 grid gap-12 lg:grid-cols-3">
        <Skeleton className="h-[200px]" /><Skeleton className="h-[200px]" /><Skeleton className="h-[200px]" />
      </div>
    </div>
  );
}
