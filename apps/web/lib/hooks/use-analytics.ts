"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "../api-client";

export interface AnalyticsOverview {
  readonly totalCalls: number;
  readonly successCount: number;
  readonly errorCount: number;
  readonly successRate: number;
  readonly avgLatencyMs: number;
  readonly p50Ms: number;
  readonly p95Ms: number;
  readonly p99Ms: number;
}

export interface ToolStat {
  readonly name: string;
  readonly calls: number;
  readonly avgMs: number;
}

export interface ToolBreakdown extends ToolStat {
  readonly toolId: string | null;
}

export interface AnalyticsResponse {
  readonly range: string;
  readonly overview: AnalyticsOverview;
  readonly topTools: readonly ToolStat[];
  readonly toolBreakdown: readonly ToolBreakdown[];
}

export type TimeRange = "24h" | "7d" | "30d";

export function useAnalytics(serverId: string, range: TimeRange = "7d") {
  return useQuery({
    queryKey: ["servers", serverId, "analytics", range],
    queryFn: () =>
      api.get<AnalyticsResponse>(`/servers/${serverId}/analytics`, { range }),
    enabled: !!serverId,
    staleTime: 60_000,
  });
}
