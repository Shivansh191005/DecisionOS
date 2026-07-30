"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Dataset, DatasetPreview } from "./use-datasets";

export interface CleaningStep {
  type: "IMPUTE_NULL" | "DROP_COLUMN" | "FILTER_ROWS" | "CAST_TYPE" | "DERIVED_COLUMN" | "BIN_COLUMN";
  column?: string;
  strategy?: "MEAN" | "MEDIAN" | "MODE" | "CONSTANT";
  value?: string | number;
  condition?: string;
  target_type?: string;
  new_column?: string;
  formula?: string;
  bins?: { condition: string; label: string }[];
}

export interface CleaningRecipe {
  id: string;
  dataset_id: string;
  workspace_id: string;
  name: string;
  description?: string;
  steps: CleaningStep[];
  created_at: string;
  updated_at: string;
}

export interface CleaningRecommendation {
  id: string;
  title: string;
  reason: string;
  severity: "WARNING" | "INFO" | "CRITICAL";
  step: CleaningStep;
}

export function useCleaningRecipes(workspaceSlug: string, datasetId: string) {
  return useQuery<CleaningRecipe[]>({
    queryKey: ["cleaning-recipes", workspaceSlug, datasetId],
    queryFn: async () => {
      const response = await apiClient.get<CleaningRecipe[]>(
        `/workspaces/${workspaceSlug}/datasets/${datasetId}/cleaning/recipes`
      );
      return response.data;
    },
    enabled: Boolean(workspaceSlug) && Boolean(datasetId),
  });
}

export function useCleaningRecommendations(workspaceSlug: string, datasetId: string) {
  return useQuery<CleaningRecommendation[]>({
    queryKey: ["cleaning-recommendations", workspaceSlug, datasetId],
    queryFn: async () => {
      const response = await apiClient.get<CleaningRecommendation[]>(
        `/workspaces/${workspaceSlug}/datasets/${datasetId}/cleaning/recommendations`
      );
      return response.data;
    },
    enabled: Boolean(workspaceSlug) && Boolean(datasetId),
  });
}

export function useCleaningPreview(workspaceSlug: string, datasetId: string) {
  return useMutation({
    mutationFn: async ({
      steps,
      limit = 50,
      offset = 0,
    }: {
      steps: CleaningStep[];
      limit?: number;
      offset?: number;
    }) => {
      const response = await apiClient.post<DatasetPreview>(
        `/workspaces/${workspaceSlug}/datasets/${datasetId}/cleaning/preview`,
        { steps, limit, offset }
      );
      return response.data;
    },
  });
}

export function useSaveCleaningRecipe(workspaceSlug: string, datasetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      description,
      steps,
    }: {
      name: string;
      description?: string;
      steps: CleaningStep[];
    }) => {
      const response = await apiClient.post<CleaningRecipe>(
        `/workspaces/${workspaceSlug}/datasets/${datasetId}/cleaning/recipes`,
        { name, description, steps }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["cleaning-recipes", workspaceSlug, datasetId],
      });
    },
  });
}

export function useCommitCleaningRecipe(workspaceSlug: string, datasetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      new_dataset_name,
      steps,
    }: {
      new_dataset_name: string;
      steps: CleaningStep[];
    }) => {
      const response = await apiClient.post<Dataset>(
        `/workspaces/${workspaceSlug}/datasets/${datasetId}/cleaning/commit`,
        { new_dataset_name, steps }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["datasets", workspaceSlug],
      });
    },
  });
}
