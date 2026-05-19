"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api-client";

export interface WebhookConfig {
  readonly configured: boolean;
  readonly provider: string | null;
}

export function useWebhookConfig(serverId: string) {
  return useQuery({
    queryKey: ["webhook-config", serverId],
    queryFn: () => api.get<WebhookConfig>(`/servers/${serverId}/webhook-config`),
    enabled: !!serverId,
  });
}

export function useSetWebhookConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      serverId,
      provider,
      secret,
    }: {
      readonly serverId: string;
      readonly provider: string;
      readonly secret: string;
    }) =>
      api.post<{ provider: string; secretWarning: string }>(
        `/servers/${serverId}/webhook-config`,
        { provider, secret },
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["webhook-config", variables.serverId],
      });
      queryClient.invalidateQueries({
        queryKey: ["servers", variables.serverId],
      });
    },
  });
}

export function useClearWebhookConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (serverId: string) =>
      api.delete<{ cleared: boolean }>(`/servers/${serverId}/webhook-config`),
    onSuccess: (_data, serverId) => {
      queryClient.invalidateQueries({
        queryKey: ["webhook-config", serverId],
      });
      queryClient.invalidateQueries({
        queryKey: ["servers", serverId],
      });
    },
  });
}
