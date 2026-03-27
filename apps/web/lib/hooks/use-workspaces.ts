"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Workspace, WorkspaceWithMembers, CreateWorkspaceInput, UpdateWorkspaceInput } from "@apifold/types";
import { api } from "../api-client";

export function useWorkspaces() {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: () => api.get<Workspace[]>("/workspaces"),
  });
}

export function useWorkspace(id: string) {
  return useQuery({
    queryKey: ["workspaces", id],
    queryFn: () => api.get<WorkspaceWithMembers>(`/workspaces/${id}`),
    enabled: !!id,
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWorkspaceInput) =>
      api.post<Workspace>("/workspaces", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { readonly id: string; readonly input: UpdateWorkspaceInput }) =>
      api.put<Workspace>(`/workspaces/${id}`, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, email, role }: { readonly workspaceId: string; readonly email: string; readonly role: string }) =>
      api.post(`/workspaces/${workspaceId}/members`, { email, role }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces", variables.workspaceId] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, userId }: { readonly workspaceId: string; readonly userId: string }) =>
      api.delete(`/workspaces/${workspaceId}/members/${userId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces", variables.workspaceId] });
    },
  });
}
