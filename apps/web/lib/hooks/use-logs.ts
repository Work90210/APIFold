"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { RequestLog } from "@apifold/types";
import { api } from "../api-client";

interface LogsResponse {
  readonly logs: RequestLog[];
  readonly cursor: string | null;
  readonly hasMore: boolean;
}

export function useLogs(
  serverId: string,
  filters?: {
    readonly method?: string;
    readonly statusCode?: string;
    readonly from?: string;
    readonly to?: string;
  },
) {
  return useInfiniteQuery({
    queryKey: ["logs", serverId, filters],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => {
      const params: Record<string, string> = {};
      if (pageParam) params.cursor = pageParam;
      if (filters?.method) params.method = filters.method;
      if (filters?.statusCode) params.statusCode = filters.statusCode;
      if (filters?.from) params.from = filters.from;
      if (filters?.to) params.to = filters.to;
      return api.get<LogsResponse>(`/servers/${serverId}/logs`, params);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.cursor ?? undefined) : undefined,
    staleTime: 10_000,
    enabled: !!serverId,
  });
}
