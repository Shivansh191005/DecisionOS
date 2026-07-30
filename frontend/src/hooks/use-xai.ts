"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export interface DriverNode {
  id: string;
  name: string;
  dimension: string;
  value: number;
  sample_count: number;
  contribution_pct: number;
  impact_direction: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | string;
  sensitivity_score: number;
  children: DriverNode[];
}

export interface DriverRanking {
  feature_name: string;
  importance_score: number;
  direction: "POSITIVE" | "NEGATIVE" | string;
  stat_metric: string;
}

export interface DriverTreeRequest {
  target_column: string;
  driver_columns?: string[];
  max_depth: number;
  top_k_branches: number;
}

export interface DriverTreeResponse {
  target_column: string;
  total_kpi_value: number;
  root_node: DriverNode;
  driver_rankings: DriverRanking[];
  ai_narrative: string;
  execution_time_ms: number;
}

export interface XAIMetadataResponse {
  numeric_columns: string[];
  categorical_columns: string[];
}

export function useXAIMetadata(workspaceSlug: string, datasetId: string) {
  return useQuery({
    queryKey: ["xai-metadata", workspaceSlug, datasetId],
    queryFn: async (): Promise<XAIMetadataResponse> => {
      const response = await apiClient.get<XAIMetadataResponse>(
        `/workspaces/${workspaceSlug}/datasets/${datasetId}/xai/metadata`
      );
      return response.data;
    },
    enabled: Boolean(workspaceSlug && datasetId),
  });
}

export function useGenerateDriverTree(workspaceSlug: string, datasetId: string) {
  return useMutation({
    mutationFn: async (payload: DriverTreeRequest): Promise<DriverTreeResponse> => {
      const response = await apiClient.post<DriverTreeResponse>(
        `/workspaces/${workspaceSlug}/datasets/${datasetId}/xai/driver-trees`,
        payload
      );
      return response.data;
    },
  });
}
