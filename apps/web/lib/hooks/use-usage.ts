"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "../api-client";

interface UsageResponse {
  readonly serverCount: number;
  readonly activeServers: number;
}

export function useUsage() {
  return useQuery({
    queryKey: ["usage"],
    queryFn: () => api.get<UsageResponse>("/usage"),
    staleTime: 60_000,
  });
}
