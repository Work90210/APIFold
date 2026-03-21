"use client";

import { useQuery } from "@tanstack/react-query";

const RUNTIME_BASE_URL = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_RUNTIME_URL || "http://localhost:3001")
  : "http://localhost:3001";
const RUNTIME_HEALTH_URL = `${RUNTIME_BASE_URL}/health`;
const POLL_INTERVAL_MS = 10_000;

interface RuntimeHealthResult {
  readonly isOnline: boolean;
  readonly isLoading: boolean;
}

async function fetchRuntimeHealth(): Promise<boolean> {
  try {
    const res = await fetch(RUNTIME_HEALTH_URL);
    const data = (await res.json()) as { status?: string };
    return data.status === "ok";
  } catch {
    return false;
  }
}

export function useRuntimeHealth(): RuntimeHealthResult {
  const { data: isOnline = false, isLoading } = useQuery({
    queryKey: ["runtime-health"],
    queryFn: fetchRuntimeHealth,
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: POLL_INTERVAL_MS,
    retry: false,
  });

  return { isOnline, isLoading };
}
