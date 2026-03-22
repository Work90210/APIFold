"use client";

import { useState, use } from "react";
import { ArrowUpDown } from "lucide-react";
import { Skeleton } from "@apifold/ui";
import { useAnalytics, type TimeRange, type ToolBreakdown } from "@/lib/hooks/use-analytics";
import { cn } from "@apifold/ui";

type SortField = "name" | "calls" | "avgMs";
type SortOrder = "asc" | "desc";

export default function ToolsAnalyticsPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = use(params);
  const [range, setRange] = useState<TimeRange>("7d");
  const [sortField, setSortField] = useState<SortField>("calls");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const { data, isLoading } = useAnalytics(id, range);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  if (!data || data.toolBreakdown.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        No tool data available yet.
      </div>
    );
  }

  const sortedTools = [...data.toolBreakdown].sort((a, b) => {
    const multiplier = sortOrder === "asc" ? 1 : -1;
    if (sortField === "name") {
      return a.name.localeCompare(b.name) * multiplier;
    }
    return (a[sortField] - b[sortField]) * multiplier;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Tool Breakdown</h2>
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

      <div className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <SortableHead
                label="Tool Name"
                field="name"
                current={sortField}
                onClick={handleSort}
              />
              <SortableHead
                label="Calls"
                field="calls"
                current={sortField}
                onClick={handleSort}
              />
              <SortableHead
                label="Avg Latency (ms)"
                field="avgMs"
                current={sortField}
                onClick={handleSort}
              />
            </tr>
          </thead>
          <tbody>
            {sortedTools.map((tool) => (
              <tr
                key={tool.toolId ?? tool.name}
                className="border-b transition-colors last:border-0 hover:bg-muted/50"
              >
                <td className="p-4 font-medium">{tool.name}</td>
                <td className="p-4 tabular-nums">{tool.calls.toLocaleString()}</td>
                <td className="p-4 font-mono tabular-nums">{tool.avgMs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortableHead({
  label,
  field,
  current,
  onClick,
}: {
  readonly label: string;
  readonly field: SortField;
  readonly current: SortField;
  readonly onClick: (field: SortField) => void;
}) {
  return (
    <th
      className="cursor-pointer p-4 text-left font-medium text-muted-foreground hover:text-foreground"
      onClick={() => onClick(field)}
    >
      <div className="flex items-center gap-2">
        {label}
        {current === field && <ArrowUpDown className="h-3 w-3" />}
      </div>
    </th>
  );
}
