"use client";

import { useState, useMemo, use } from "react";
import { ScrollText } from "lucide-react";
import { Button, Skeleton, EmptyState } from "@apifold/ui";
import { useLogs } from "@/lib/hooks";
import { FilterBar } from "@/components/logs/filter-bar";
import { LogTable } from "@/components/logs/log-table";
import { LogRetentionNotice } from "@/components/logs/log-retention-notice";

export default function LogsPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = use(params);
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

  const { data, status, fetchStatus, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useLogs(id, activeFilters);

  const logs = data?.pages.flatMap((page) => page.logs) ?? [];
  const isLoading = status === "pending" || (status === "success" && fetchStatus === "fetching" && logs.length === 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-lg font-semibold tracking-tight">Logs</h1>

      {/* Retention notice */}
      <LogRetentionNotice />

      {/* Filter bar */}
      <div className="rounded-lg border border-border p-4">
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
          Filters
        </h3>
        <FilterBar filters={filters} onChange={setFilters} />
      </div>

      {/* Log table */}
      {isLoading ? (
        <Skeleton className="h-96 rounded-lg" />
      ) : logs.length > 0 ? (
        <div className="space-y-4">
          <LogTable logs={logs} />
          {hasNextPage && (
            <div className="flex justify-center pt-2">
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
        </div>
      ) : (
        <div className="rounded-lg border border-border p-12">
          <EmptyState
            icon={ScrollText}
            title="No logs yet"
            description="Logs will appear here once tools start receiving requests."
          />
        </div>
      )}

    </div>
  );
}
