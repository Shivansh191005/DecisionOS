"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export interface CorrelationAlert {
  id: string;
  title: string;
  description: string;
  severity: "WARNING" | "INFO" | "CRITICAL";
  metric_badge: string;
}

export interface CorrelationPair {
  column_x: string;
  column_y: string;
  correlation: number;
  is_collinear: boolean;
}

export interface CorrelationMatrixResponse {
  columns: string[];
  pairs: CorrelationPair[];
  matrix: Record<string, Record<string, number>>;
  alerts: CorrelationAlert[];
}

export interface HistogramBin {
  bin_index: number;
  range_start: number;
  range_end: number;
  label: string;
  count: number;
}

export interface DistributionResponse {
  column: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean: number;
  std: number;
  iqr: number;
  skewness: number;
  skewness_label: "HIGH_SKEW" | "MODERATE_SKEW" | "SYMMETRIC";
  skewness_alert: string;
  histogram_bins: HistogramBin[];
}

export interface OutlierResponse {
  column: string;
  method: string;
  lower_bound: number;
  upper_bound: number;
  total_outliers: number;
  outlier_percentage: number;
  sample_outliers: Record<string, any>[];
}

export interface AutoInsightItem {
  id: string;
  category: "DRIVER" | "RISK" | "PARETO" | "ANOMALY" | "INFO";
  title: string;
  description: string;
  metric_badge: string;
  severity: "WARNING" | "INFO" | "CRITICAL";
}

export interface AutoInsightsBriefingResponse {
  dataset_id: string;
  dataset_name: string;
  total_insights: number;
  insights: AutoInsightItem[];
}

export function useCorrelationMatrix(workspaceSlug: string, datasetId: string) {
  return useQuery<CorrelationMatrixResponse>({
    queryKey: ["eda", "correlations", workspaceSlug, datasetId],
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/workspaces/${workspaceSlug}/datasets/${datasetId}/eda/correlations`
      );
      return data;
    },
    enabled: Boolean(workspaceSlug) && Boolean(datasetId),
  });
}

export function useColumnDistribution(
  workspaceSlug: string,
  datasetId: string,
  column: string
) {
  return useQuery<DistributionResponse>({
    queryKey: ["eda", "distributions", workspaceSlug, datasetId, column],
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/workspaces/${workspaceSlug}/datasets/${datasetId}/eda/distributions`,
        { params: { column } }
      );
      return data;
    },
    enabled: Boolean(workspaceSlug) && Boolean(datasetId) && Boolean(column),
  });
}

export function useColumnOutliers(
  workspaceSlug: string,
  datasetId: string,
  column: string,
  method: "IQR" | "ZSCORE" = "IQR",
  limit: number = 50
) {
  return useQuery<OutlierResponse>({
    queryKey: ["eda", "outliers", workspaceSlug, datasetId, column, method, limit],
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/workspaces/${workspaceSlug}/datasets/${datasetId}/eda/outliers`,
        { params: { column, method, limit } }
      );
      return data;
    },
    enabled: Boolean(workspaceSlug) && Boolean(datasetId) && Boolean(column),
  });
}

export function useEDAInsights(workspaceSlug: string, datasetId: string) {
  return useQuery<AutoInsightsBriefingResponse>({
    queryKey: ["eda", "insights", workspaceSlug, datasetId],
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/workspaces/${workspaceSlug}/datasets/${datasetId}/eda/insights`
      );
      return data;
    },
    enabled: Boolean(workspaceSlug) && Boolean(datasetId),
  });
}
