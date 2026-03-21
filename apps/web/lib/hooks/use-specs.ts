"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Spec, CreateSpecInput } from "@apifold/types";
import { api } from "../api-client";

export function useSpecs() {
  return useQuery({
    queryKey: ["specs"],
    queryFn: () => api.get<Spec[]>("/specs"),
  });
}

export function useSpec(id: string) {
  return useQuery({
    queryKey: ["specs", id],
    queryFn: () => api.get<Spec>(`/specs/${id}`),
    enabled: !!id,
  });
}

export function useImportSpec() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSpecInput) => api.post<Spec>("/specs", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specs"] });
      queryClient.invalidateQueries({ queryKey: ["usage"] });
    },
  });
}

export function useDeleteSpec() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/specs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specs"] });
    },
  });
}
