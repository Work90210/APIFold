"use client";

import { useState, useMemo } from "react";
import { ScrollText } from "lucide-react";
import { BackLink } from "@/components/shared/back-link";
import { PageHeader } from "@/components/shared/page-header";
import type { RequestLog } from "@apifold/types";
import { Button, Skeleton, EmptyState } from "@apifold/ui";
import { useLogs } from "@/lib/hooks";
import { FilterBar } from "@/components/logs/filter-bar";
import { LogTable } from "@/components/logs/log-table";
import { LogDetailModal } from "@/components/logs/log-detail-modal";
import { LogRetentionNotice } from "@/components/logs/log-retention-notice";

export default function LogsPage({
  params,
}: {
  readonly params: { readonly id: string };
}) {
  const { id } = params;
  const [filters, setFilters] = useState({
    method: "",
    statusCode: "",
    from: "",
    to: "",
  });
  const [selectedLog, setSelectedLog] = useState<RequestLog | null>(null);

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
    <div className="animate-in space-y-8">
      <BackLink href={`/dashboard/servers/${id}`} label="Back to Server" />

      <PageHeader title="Logs" description="Inspect incoming requests and responses." />

      <div className="border-t border-border/40" />

      {/* Retention notice */}
      <LogRetentionNotice />

      {/* Filter bar */}
      <div className="rounded-xl bg-card shadow-sm p-6">
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
          Filters
        </h3>
        <FilterBar filters={filters} onChange={setFilters} />
      </div>

      {/* Log table */}
      {isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : logs.length > 0 ? (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl bg-card shadow-sm">
            <LogTable logs={logs} onSelectLog={setSelectedLog} />
          </div>
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
        <div className="rounded-xl bg-card shadow-sm p-12">
          <EmptyState
            icon={ScrollText}
            title="No logs yet"
            description="Logs will appear here once tools start receiving requests."
          />
        </div>
      )}

      <LogDetailModal
        log={selectedLog}
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
}
