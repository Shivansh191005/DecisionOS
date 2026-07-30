"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, setActiveOrganizationId } from "@/lib/api";
import {
  Organization,
  useAppStore,
  Workspace,
} from "@/store/use-app-store";

export interface CreateWorkspacePayload {
  name: string;
  description?: string;
}

export function useWorkspace() {
  const queryClient = useQueryClient();
  const {
    organizations,
    activeOrganization,
    workspaces,
    activeWorkspace,
    setOrganizations,
    setActiveOrganization,
    setWorkspaces,
    setActiveWorkspace,
  } = useAppStore();

  const orgsQuery = useQuery<Organization[]>({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data } = await apiClient.get<Organization[]>("/organizations");
      setOrganizations(data);
      if (data.length > 0 && !activeOrganization) {
        setActiveOrganization(data[0]);
        setActiveOrganizationId(data[0].id);
      }
      return data;
    },
  });

  const wsQuery = useQuery<Workspace[]>({
    queryKey: ["workspaces", activeOrganization?.id],
    queryFn: async () => {
      if (!activeOrganization) return [];
      const { data } = await apiClient.get<Workspace[]>("/workspaces", {
        headers: { "X-Organization-Id": activeOrganization.id },
      });
      setWorkspaces(data);
      if (data.length > 0 && !activeWorkspace) {
        const defaultWs = data.find((ws) => ws.is_default) || data[0];
        setActiveWorkspace(defaultWs);
      }
      return data;
    },
    enabled: !!activeOrganization?.id,
  });

  const createWorkspaceMutation = useMutation({
    mutationFn: async (payload: CreateWorkspacePayload) => {
      if (!activeOrganization) {
        throw new Error("No active organization selected");
      }
      const { data } = await apiClient.post<Workspace>("/workspaces", payload, {
        headers: { "X-Organization-Id": activeOrganization.id },
      });
      return data;
    },
    onSuccess: (newWs) => {
      queryClient.invalidateQueries({
        queryKey: ["workspaces", activeOrganization?.id],
      });
      setActiveWorkspace(newWs);
    },
  });

  return {
    organizations: orgsQuery.data || organizations,
    activeOrganization,
    workspaces: wsQuery.data || workspaces,
    activeWorkspace,
    isLoadingOrgs: orgsQuery.isLoading,
    isLoadingWorkspaces: wsQuery.isLoading,
    switchOrganization: (org: Organization) => {
      setActiveOrganization(org);
      setActiveOrganizationId(org.id);
      setActiveWorkspace(null);
    },
    switchWorkspace: (ws: Workspace) => {
      setActiveWorkspace(ws);
    },
    createWorkspace: createWorkspaceMutation.mutate,
    isCreatingWorkspace: createWorkspaceMutation.isPending,
  };
}
