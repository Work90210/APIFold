"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@apifold/ui";
import { useLogs } from "@/lib/hooks";
import { LogTable } from "@/components/logs/log-table";
import { FilterBar } from "@/components/logs/filter-bar";
import { LogDetailModal } from "@/components/logs/log-detail-modal";
import type { RequestLog } from "@apifold/types";
import { useState } from "react";
import { Button } from "@apifold/ui";

export default function AnalyticsLogsPage({
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
  const [selectedLog, setSelectedLog] = useState<RequestLog | null>(null);

  const activeFilters = (() => {
    const result: Record<string, string> = {};
    if (filters.method) result.method = filters.method;
    if (filters.statusCode) result.statusCode = filters.statusCode;
    if (filters.from) result.from = filters.from;
    if (filters.to) result.to = filters.to;
    return Object.keys(result).length > 0 ? result : undefined;
  })();

  const { data, status, fetchStatus, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useLogs(id, activeFilters);

  const logs = data?.pages.flatMap((page) => page.logs) ?? [];
  const isLoading = status === "pending" || (status === "success" && fetchStatus === "fetching" && logs.length === 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Request Logs</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Full request log with search and filtering
          </p>
        </div>
        <Link
          href={`/dashboard/servers/${id}/analytics`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Back to overview
        </Link>
      </div>

      <FilterBar filters={filters} onChange={setFilters} />

      {isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : logs.length > 0 ? (
        <div className="space-y-4">
          <LogTable logs={logs} onSelectLog={setSelectedLog} />
          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No request logs found matching your filters.
        </p>
      )}

      <LogDetailModal
        log={selectedLog}
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
}
