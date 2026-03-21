"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { McpTool, UpdateToolInput } from "@apifold/types";
import { api } from "../api-client";

export function useTools(serverId: string) {
  return useQuery({
    queryKey: ["tools", serverId],
    queryFn: () => api.get<McpTool[]>(`/servers/${serverId}/tools`),
    enabled: !!serverId,
  });
}

export function useUpdateTool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      serverId,
      toolId,
      input,
    }: {
      readonly serverId: string;
      readonly toolId: string;
      readonly input: UpdateToolInput;
    }) => api.put<McpTool>(`/servers/${serverId}/tools/${toolId}`, input),
    onMutate: async (variables) => {
      const queryKey = ["tools", variables.serverId];
      await queryClient.cancelQueries({ queryKey });
      const previousTools = queryClient.getQueryData<McpTool[]>(queryKey);
      if (previousTools) {
        const updatedTools = previousTools.map((tool) =>
          tool.id === variables.toolId
            ? { ...tool, ...variables.input }
            : tool,
        );
        queryClient.setQueryData(queryKey, updatedTools);
      }
      return { previousTools };
    },
    onError: (_error, variables, context) => {
      if (context?.previousTools) {
        queryClient.setQueryData(
          ["tools", variables.serverId],
          context.previousTools,
        );
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["tools", variables.serverId],
      });
    },
  });
}

interface TestToolInput {
  readonly serverId: string;
  readonly toolName: string;
  readonly input: Record<string, unknown>;
}

interface TestToolResult {
  readonly content: unknown;
  readonly isError: boolean;
  readonly durationMs: number;
}

export function useTestTool() {
  return useMutation({
    mutationFn: ({ serverId, toolName, input }: TestToolInput) =>
      api.post<TestToolResult>(`/servers/${serverId}/test`, {
        toolName,
        input,
      }),
  });
}
