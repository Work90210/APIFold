"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SpecVersion, SpecRelease, CreateSpecVersionInput, ReleaseEnvironment } from "@apifold/types";
import { api } from "../api-client";

export function useSpecVersions(specId: string) {
  return useQuery({
    queryKey: ["spec-versions", specId],
    queryFn: () => api.get<readonly SpecVersion[]>(`/specs/${specId}/versions`),
    enabled: !!specId,
    staleTime: 30_000,
  });
}

interface CreateVersionInput {
  readonly specId: string;
  readonly versionLabel?: string;
  readonly rawSpec: Record<string, unknown>;
  readonly toolSnapshot: Record<string, unknown>[];
  readonly sourceUrl?: string;
}

export function useCreateVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVersionInput) =>
      api.post<SpecVersion>(`/specs/${input.specId}/versions`, {
        versionLabel: input.versionLabel,
        rawSpec: input.rawSpec,
        toolSnapshot: input.toolSnapshot,
        sourceUrl: input.sourceUrl,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["spec-versions", variables.specId] });
      queryClient.invalidateQueries({ queryKey: ["specs", variables.specId] });
      queryClient.invalidateQueries({ queryKey: ["specs"] });
    },
  });
}

interface PromoteVersionInput {
  readonly specId: string;
  readonly versionId: string;
  readonly serverId: string;
  readonly environment?: ReleaseEnvironment;
  readonly endpointUrl?: string;
}

export function usePromoteVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PromoteVersionInput) =>
      api.post<SpecRelease>(
        `/specs/${input.specId}/versions/${input.versionId}/promote`,
        {
          serverId: input.serverId,
          environment: input.environment,
          endpointUrl: input.endpointUrl,
        },
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["spec-versions", variables.specId] });
      queryClient.invalidateQueries({ queryKey: ["servers", variables.serverId] });
    },
  });
}
