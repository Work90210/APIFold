"use client";

import { useState, use } from "react";
import { Circle, Download } from "lucide-react";
import { Skeleton, Button } from "@apifold/ui";
import { cn } from "@apifold/ui";
import { useAnalytics, type TimeRange } from "@/lib/hooks/use-analytics";

const RANGE_LABELS: Record<TimeRange, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

export default function ErrorExplorerPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = use(params);
  const [range, setRange] = useState<TimeRange>("7d");
  const [statusFilter, setStatusFilter] = useState<number | null>(null);
  const { data, isLoading } = useAnalytics(id, range);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  const errors = data?.errorBreakdown ?? [];
  const failingTools = data?.failingTools ?? [];
  const recentErrors = (data?.recentActivity ?? []).filter((c) => c.status >= 400);

  // Apply status code filter to recent errors
  const filteredErrors = statusFilter
    ? recentErrors.filter((c) => c.status === statusFilter)
    : recentErrors;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Error Explorer</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {data?.overview.errorCount ?? 0} errors in the {RANGE_LABELS[range].toLowerCase()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-md border border-border p-0.5">
            {(["24h", "7d", "30d"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/servers/${id}/analytics/export?range=${range}&type=errors`, '_blank')}
          >
            <Download className="mr-2 h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {errors.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No errors in this period</p>
      ) : (
        <>
          {/* Status code filters */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter(null)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors border",
                !statusFilter ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              All ({data?.overview.errorCount ?? 0})
            </button>
            {errors.map((e) => (
              <button
                key={`${e.statusCode}-${e.errorCode}`}
                type="button"
                onClick={() => setStatusFilter(e.statusCode)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors border",
                  statusFilter === e.statusCode ? "border-status-error bg-status-error-muted text-status-error" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {e.statusCode} ({e.count})
              </button>
            ))}
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Failed requests */}
            <div className="lg:col-span-2">
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">Recent failed requests</h3>
              <div className="border-t border-border/50">
                {filteredErrors.length > 0 ? (
                  filteredErrors.map((call, i) => (
                    <div
                      key={`${call.timestamp}-${i}`}
                      className={cn(
                        "flex items-center justify-between py-2.5",
                        i < filteredErrors.length - 1 && "border-b border-border/20",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Circle className="h-2 w-2 fill-current text-status-error" />
                        <span className="text-sm font-medium">{call.tool}</span>
                        <span className="rounded bg-status-error-muted px-1.5 py-0.5 text-xs font-mono text-status-error">
                          {call.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="tabular-nums">{call.durationMs}ms</span>
                        <span>{new Date(call.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No {statusFilter ? `${statusFilter} ` : ""}errors in recent activity
                  </p>
                )}
              </div>
            </div>

            {/* Failing tools */}
            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">Tools by error rate</h3>
              {failingTools.length > 0 ? (
                <div className="space-y-3">
                  {failingTools.map((t) => (
                    <div key={t.name}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-medium truncate mr-2">{t.name}</span>
                        <span className="text-status-error tabular-nums text-xs">{t.errorRate}%</span>
                      </div>
                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-status-error transition-all duration-500 ease-out-expo motion-reduce:transition-none"
                          style={{ width: `${Math.min(t.errorRate, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No tool-level errors</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
