"use client";

import { useState, useMemo, useCallback, use } from "react";
import {
  ScrollText,
  ChevronRight,
  Search,
  Play,
  Pause,
  SlidersHorizontal,
  X,
  AlertCircle,
} from "lucide-react";
import { Button, Skeleton, EmptyState } from "@apifold/ui";
import { cn } from "@apifold/ui";
import type { RequestLog } from "@apifold/types";
import { useLogs } from "@/lib/hooks";
import { FilterBar } from "@/components/logs/filter-bar";

type FilterTab = "all" | "ok" | "errors";

/* ------------------------------------------------------------------ */
/*  Detail panel                                                       */
/* ------------------------------------------------------------------ */

function DetailPanel({
  log,
  onClose,
}: {
  readonly log: RequestLog;
  readonly onClose: () => void;
}) {
  const isError = log.statusCode >= 400;

  const formattedRequestBody = useMemo(() => {
    if (!log.requestBody) return null;
    try {
      return JSON.stringify(log.requestBody, null, 2);
    } catch {
      return String(log.requestBody);
    }
  }, [log.requestBody]);

  const formattedResponseBody = useMemo(() => {
    if (!log.responseBody) return null;
    try {
      const parsed = JSON.parse(log.responseBody);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return log.responseBody;
    }
  }, [log.responseBody]);

  return (
    <div className="sticky top-6 rounded-lg border border-border bg-surface-1 overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-medium">Request detail</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close detail panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="divide-y divide-border/50 text-xs">
        {[
          { label: "Request ID", value: log.requestId, mono: true },
          { label: "Tool", value: log.toolName ?? "—" },
          { label: "Method", value: log.method },
          { label: "Path", value: log.path, mono: true },
          {
            label: "Status",
            value: String(log.statusCode),
            color: isError ? "text-status-error" : "text-[var(--brand-cyan)]",
          },
          {
            label: "Latency",
            value: `${log.durationMs}ms`,
            color: log.durationMs > 200
              ? "text-status-warning"
              : log.durationMs > 100
                ? "text-muted-foreground"
                : "text-[var(--brand-cyan)]",
          },
          { label: "Time", value: new Date(log.timestamp).toLocaleString() },
          ...(log.errorMessage
            ? [{ label: "Error", value: log.errorMessage, color: "text-status-error" }]
            : []),
        ].map((item) => (
          <div key={item.label} className="px-4 py-2.5">
            <dt className="text-[11px] text-muted-foreground">{item.label}</dt>
            <dd
              className={cn(
                "mt-0.5 truncate",
                "mono" in item && item.mono && "font-mono",
                "color" in item && item.color,
              )}
            >
              {item.value}
            </dd>
          </div>
        ))}
      </div>

      {formattedRequestBody && (
        <div className="border-t border-border">
          <div className="px-4 py-2 text-[11px] font-medium text-muted-foreground border-b border-border/50">
            Request body
          </div>
          <pre className="max-h-40 overflow-auto px-4 py-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {formattedRequestBody}
          </pre>
        </div>
      )}

      {formattedResponseBody && (
        <div className="border-t border-border">
          <div className="px-4 py-2 text-[11px] font-medium text-muted-foreground border-b border-border/50">
            Response body
          </div>
          <pre className={cn(
            "max-h-44 overflow-auto px-4 py-3 font-mono text-[11px] leading-relaxed",
            isError ? "text-status-error/80" : "text-muted-foreground",
          )}>
            {formattedResponseBody}
          </pre>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton rows                                              */
/* ------------------------------------------------------------------ */

function SkeletonRows() {
  return (
    <div className="rounded-lg border border-border bg-surface-1 overflow-hidden">
      <div className="flex items-center gap-4 border-b border-border px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <span className="w-[72px]">Time</span>
        <span className="w-14 text-center">Status</span>
        <span className="flex-1">Tool</span>
        <span className="w-28 hidden sm:block">Server</span>
        <span className="w-16 text-right">Latency</span>
        <span className="w-5" />
      </div>
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border/50 px-4 py-2.5"
        >
          <Skeleton className="h-4 w-[72px]" />
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-4 flex-1 max-w-[180px]" />
          <Skeleton className="h-4 w-28 hidden sm:block" />
          <Skeleton className="h-4 w-16" />
          <span className="w-5" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function LogsPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = use(params);
  const [isLive, setIsLive] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    method: "",
    statusCode: "",
    from: "",
    to: "",
  });

  const activeFilters = useMemo(() => {
    const result: Record<string, string> = {};
    if (filters.method) result.method = filters.method;
    if (filters.statusCode) result.statusCode = filters.statusCode;
    if (filters.from) result.from = filters.from;
    if (filters.to) result.to = filters.to;
    return Object.keys(result).length > 0 ? result : undefined;
  }, [filters]);

  const { data, status, fetchStatus, fetchNextPage, hasNextPage, isFetchingNextPage, error } =
    useLogs(id, activeFilters, {
      refetchInterval: isLive ? 15_000 : false,
    });

  const allLogs = useMemo(
    () => data?.pages.flatMap((page) => page.logs) ?? [],
    [data],
  );
  const isLoading = status === "pending" || (status === "success" && fetchStatus === "fetching" && allLogs.length === 0);

  const displayLogs = useMemo(() => {
    let logs = allLogs;

    if (filterTab === "ok") {
      logs = logs.filter((l) => l.statusCode < 400);
    } else if (filterTab === "errors") {
      logs = logs.filter((l) => l.statusCode >= 400);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      logs = logs.filter(
        (l) =>
          (l.toolName ?? "").toLowerCase().includes(q) ||
          l.path.toLowerCase().includes(q) ||
          l.method.toLowerCase().includes(q) ||
          String(l.statusCode).includes(q),
      );
    }

    return logs;
  }, [allLogs, filterTab, searchQuery]);

  const selectedLog = useMemo(
    () => allLogs.find((l) => l.id === selectedLogId) ?? null,
    [allLogs, selectedLogId],
  );

  const handleRowClick = useCallback((logId: string) => {
    setSelectedLogId((prev) => (prev === logId ? null : logId));
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Real-time request log</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 gap-1.5 text-xs",
              isLive && "border-[var(--brand-cyan)]/30 text-[var(--brand-cyan)]",
            )}
            onClick={() => setIsLive(!isLive)}
          >
            {isLive ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            {isLive ? "Live" : "Paused"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-3 w-3" />
            Filter
          </Button>
        </div>
      </div>

      {/* Advanced filters */}
      {showFilters && (
        <div className="mt-4 rounded-lg border border-border bg-surface-1 p-4">
          <FilterBar filters={filters} onChange={setFilters} />
        </div>
      )}

      {/* Two-column layout */}
      <div className={cn("mt-6 gap-6", selectedLog ? "grid grid-cols-1 lg:grid-cols-[1fr_360px]" : "")}>
        {/* Left: log table */}
        <div className="min-w-0">
          {/* Filter tabs + search + count */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
              {(["all", "ok", "errors"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilterTab(tab)}
                  className={cn(
                    "rounded px-3 py-1 text-xs font-medium capitalize transition-colors",
                    filterTab === tab
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab === "ok" ? "OK" : tab === "errors" ? "Errors" : "All"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search tools, paths..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 rounded-md border border-border bg-transparent pl-8 pr-3 text-xs transition-colors placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">
                {displayLogs.length} entries
              </span>
            </div>
          </div>

          {/* Error state */}
          {status === "error" && (
            <div className="rounded-lg border border-status-error/30 bg-status-error-muted p-6 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-status-error" />
              <p className="mt-2 text-sm text-status-error">
                {error?.message ?? "Failed to load logs"}
              </p>
            </div>
          )}

          {/* Table */}
          {status !== "error" && (
            <>
              {isLoading ? (
                <SkeletonRows />
              ) : allLogs.length === 0 ? (
                <div className="rounded-lg border border-border bg-surface-1 px-4 py-12">
                  <EmptyState
                    icon={ScrollText}
                    title="No logs yet"
                    description="Logs will appear here once requests are made to this server."
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-surface-1 overflow-hidden">
                  {/* Table header */}
                  <div className="flex items-center gap-4 border-b border-border px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    <span className="w-[72px]">Time</span>
                    <span className="w-14 text-center">Status</span>
                    <span className="flex-1">Tool</span>
                    <span className="w-28 hidden sm:block">Path</span>
                    <span className="w-16 text-right">Latency</span>
                    <span className="w-5" />
                  </div>

                  {/* Rows */}
                  {displayLogs.length === 0 ? (
                    <div className="px-4 py-12">
                      <EmptyState
                        icon={ScrollText}
                        title="No matching logs"
                        description="Try adjusting your filters or search query."
                      />
                    </div>
                  ) : (
                    displayLogs.map((log) => {
                      const isSelected = selectedLogId === log.id;
                      const isError = log.statusCode >= 400;
                      const is5xx = log.statusCode >= 500;
                      const time = new Date(log.timestamp);
                      const timeStr = time.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      });

                      return (
                        <div
                          key={log.id}
                          className={cn(
                            "flex items-center gap-4 border-b border-border/50 px-4 py-2.5 cursor-pointer text-sm transition-colors duration-100",
                            isSelected
                              ? "bg-primary/5"
                              : "hover:bg-muted/30",
                          )}
                          onClick={() => handleRowClick(log.id)}
                        >
                          <span className="w-[72px] font-mono text-xs tabular-nums text-muted-foreground">
                            {timeStr}
                          </span>
                          <span className="w-14 text-center">
                            <span
                              className={cn(
                                "inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[11px] font-medium",
                                is5xx
                                  ? "bg-status-error-muted text-status-error"
                                  : isError
                                    ? "bg-status-warning-muted text-status-warning"
                                    : "bg-[rgba(79,251,223,0.08)] text-[var(--brand-cyan)]",
                              )}
                            >
                              {log.statusCode}
                            </span>
                          </span>
                          <span className="flex-1 truncate font-mono text-xs">
                            {log.toolName ?? log.method}
                          </span>
                          <span className="w-28 hidden sm:block truncate text-xs text-muted-foreground">
                            {log.path}
                          </span>
                          <span
                            className={cn(
                              "w-16 text-right font-mono text-xs tabular-nums",
                              log.durationMs > 200
                                ? "text-status-warning"
                                : log.durationMs > 100
                                  ? "text-muted-foreground"
                                  : "text-[var(--brand-cyan)]",
                            )}
                          >
                            {log.durationMs}ms
                          </span>
                          <ChevronRight
                            className={cn(
                              "h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-transform duration-100",
                              isSelected && "rotate-90 text-foreground",
                            )}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Load more */}
              {hasNextPage && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    className="rounded-lg"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? "Loading logs..." : "Load More Logs"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: detail panel */}
        {selectedLog && (
          <div className="hidden lg:block">
            <DetailPanel log={selectedLog} onClose={() => setSelectedLogId(null)} />
          </div>
        )}
      </div>

      {/* Mobile detail panel — shown below table */}
      {selectedLog && (
        <div className="mt-4 lg:hidden">
          <DetailPanel log={selectedLog} onClose={() => setSelectedLogId(null)} />
        </div>
      )}
    </div>
  );
}
