"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  McpServer,
  CreateServerInput,
  UpdateServerInput,
} from "@apifold/types";
import { api } from "../api-client";

export function useServers(specId?: string) {
  return useQuery({
    queryKey: ["servers", { specId }],
    queryFn: async () => {
      const servers = await api.get<McpServer[]>("/servers");
      if (specId) {
        return servers.filter((s) => s.specId === specId);
      }
      return servers;
    },
  });
}

export function useServer(id: string) {
  return useQuery({
    queryKey: ["servers", id],
    queryFn: () => api.get<McpServer>(`/servers/${id}`),
    enabled: !!id,
  });
}

export function useCreateServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      specId,
      input,
    }: {
      readonly specId: string;
      readonly input: CreateServerInput;
    }) => api.post<McpServer>(`/specs/${specId}/servers`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servers"] });
      queryClient.invalidateQueries({ queryKey: ["specs"] });
    },
  });
}

export function useUpdateServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      readonly id: string;
      readonly input: UpdateServerInput;
    }) => api.put<McpServer>(`/servers/${id}`, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["servers", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["servers"] });
    },
  });
}

export function useDeleteServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/servers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servers"] });
    },
  });
}
