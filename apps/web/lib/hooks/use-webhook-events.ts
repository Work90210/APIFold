"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "../api-client";

export interface WebhookEvent {
  readonly id: string;
  readonly eventName: string;
  readonly payload: Record<string, unknown>;
  readonly receivedAt: string;
}

export function useWebhookEvents(serverId: string) {
  return useQuery({
    queryKey: ["webhook-events", serverId],
    queryFn: () => api.get<WebhookEvent[]>(`/servers/${serverId}/webhook-events`),
    enabled: !!serverId,
    refetchInterval: 10_000,
  });
}
