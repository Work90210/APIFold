"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api-client";

export interface AccessProfile {
  readonly id: string;
  readonly serverId: string;
  readonly userId: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly toolIds: readonly string[];
  readonly isDefault: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface CreateProfileInput {
  readonly name: string;
  readonly slug: string;
  readonly description?: string;
  readonly toolIds: string[];
}

interface UpdateProfileInput {
  readonly name?: string;
  readonly description?: string | null;
  readonly toolIds?: string[];
}

export function useProfiles(serverId: string) {
  return useQuery({
    queryKey: ["servers", serverId, "profiles"],
    queryFn: () => api.get<AccessProfile[]>(`/servers/${serverId}/profiles`),
    enabled: !!serverId,
  });
}

export function useCreateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      serverId,
      input,
    }: {
      readonly serverId: string;
      readonly input: CreateProfileInput;
    }) => api.post<AccessProfile>(`/servers/${serverId}/profiles`, input),
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["servers", variables.serverId, "profiles"],
      });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      serverId,
      profileId,
      input,
    }: {
      readonly serverId: string;
      readonly profileId: string;
      readonly input: UpdateProfileInput;
    }) =>
      api.put<AccessProfile>(
        `/servers/${serverId}/profiles?profileId=${profileId}`,
        input,
      ),
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["servers", variables.serverId, "profiles"],
      });
    },
  });
}

export function useDeleteProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      serverId,
      profileId,
    }: {
      readonly serverId: string;
      readonly profileId: string;
    }) =>
      api.delete<{ deleted: boolean }>(
        `/servers/${serverId}/profiles?profileId=${profileId}`,
      ),
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["servers", variables.serverId, "profiles"],
      });
    },
  });
}
