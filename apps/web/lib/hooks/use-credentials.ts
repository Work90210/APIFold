"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SafeCredential, CreateCredentialInput } from "@apifold/types";
import { api } from "../api-client";

export function useCreateCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      serverId,
      input,
    }: {
      readonly serverId: string;
      readonly input: CreateCredentialInput;
    }) => api.post<SafeCredential>(`/servers/${serverId}/credentials`, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["servers", variables.serverId],
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
      api.delete<void>(`/servers/${serverId}/credentials/${credentialId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["servers", variables.serverId],
      });
    },
  });
}
