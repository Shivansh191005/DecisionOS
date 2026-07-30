"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export interface OptimizationRequest {
  mode: "GOAL_SEEK" | "RESOURCE_ALLOCATION" | string;
  target_column: string;
  target_goal_value?: number;
  constraint_column?: string;
  total_budget_constraint?: number;
  segment_column?: string;
  max_adjustment_pct: number;
}

export interface OptimizationResultItem {
  segment_or_driver: string;
  current_value: number;
  recommended_value: number;
  adjustment_delta: number;
  adjustment_pct: number;
  expected_kpi_impact: number;
  efficiency_roi: number;
}

export interface OptimizationResponse {
  mode: string;
  target_column: string;
  baseline_kpi_value: number;
  optimized_kpi_value: number;
  total_uplift_pct: number;
  allocations: OptimizationResultItem[];
  ai_prescriptive_narrative: string;
  execution_time_ms: number;
}

export interface OptimizationMetadataResponse {
  numeric_columns: string[];
  categorical_columns: string[];
}

export function useOptimizationMetadata(workspaceSlug: string, datasetId: string) {
  return useQuery({
    queryKey: ["optimization-metadata", workspaceSlug, datasetId],
    queryFn: async (): Promise<OptimizationMetadataResponse> => {
      const response = await apiClient.get<OptimizationMetadataResponse>(
        `/workspaces/${workspaceSlug}/datasets/${datasetId}/optimization/metadata`
      );
      return response.data;
    },
    enabled: Boolean(workspaceSlug && datasetId),
  });
}

export function useSolveOptimization(workspaceSlug: string, datasetId: string) {
  return useMutation({
    mutationFn: async (
      payload: OptimizationRequest
    ): Promise<OptimizationResponse> => {
      const response = await apiClient.post<OptimizationResponse>(
        `/workspaces/${workspaceSlug}/datasets/${datasetId}/optimization/solve`,
        payload
      );
      return response.data;
    },
  });
}
