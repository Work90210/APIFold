"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SafeCredential } from "@apifold/types";
import { api } from "../api-client";

export function useCredentials(serverId: string) {
  return useQuery({
    queryKey: ["servers", serverId, "credentials"],
    queryFn: () => api.get<readonly SafeCredential[]>(`/servers/${serverId}/credentials`),
    enabled: !!serverId,
  });
}

export function useCreateCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      serverId,
      input,
    }: {
      readonly serverId: string;
      readonly input: Record<string, unknown>;
    }) => api.post<SafeCredential>(`/servers/${serverId}/credentials`, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["servers", variables.serverId],
      });
      queryClient.invalidateQueries({
        queryKey: ["servers", variables.serverId, "credentials"],
      });
    },
  });
}

export function useDeleteCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      serverId,
      credentialId,
    }: {
      readonly serverId: string;
      readonly credentialId: string;
    }) =>
      api.delete<void>(`/servers/${serverId}/credentials?credentialId=${credentialId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["servers", variables.serverId],
      });
      queryClient.invalidateQueries({
        queryKey: ["servers", variables.serverId, "credentials"],
      });
    },
  });
}

export function useOAuthAuthorize() {
  return useMutation({
    mutationFn: (data: {
      readonly serverId: string;
      readonly provider: string;
      readonly clientId: string;
      readonly clientSecret: string;
      readonly scopes?: readonly string[];
    }) =>
      api.post<{ readonly authorizationUrl: string; readonly state: string }>(
        "/oauth/authorize",
        data,
      ),
  });
}

export function useOAuthClientCredentials() {
  return useMutation({
    mutationFn: (data: {
      readonly serverId: string;
      readonly provider: string;
      readonly clientId: string;
      readonly clientSecret: string;
      readonly label: string;
      readonly scopes?: readonly string[];
    }) =>
      api.post<SafeCredential>("/oauth/client-credentials", data),
  });
}
