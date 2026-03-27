"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CompositeServer,
  CompositeServerWithMembers,
  CreateCompositeInput,
  UpdateCompositeInput,
} from "@apifold/types";
import { api } from "../api-client";

export function useComposites() {
  return useQuery({
    queryKey: ["composites"],
    queryFn: () => api.get<CompositeServer[]>("/composites"),
  });
}

export function useComposite(id: string) {
  return useQuery({
    queryKey: ["composites", id],
    queryFn: () => api.get<CompositeServerWithMembers>(`/composites/${id}`),
    enabled: !!id,
  });
}

export function useCreateComposite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCompositeInput) =>
      api.post<CompositeServer>("/composites", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["composites"] });
    },
  });
}

export function useUpdateComposite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      readonly id: string;
      readonly input: UpdateCompositeInput;
    }) => api.put<CompositeServer>(`/composites/${id}`, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["composites", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["composites"] });
    },
  });
}

export function useDeleteComposite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/composites/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["composites"] });
    },
  });
}
