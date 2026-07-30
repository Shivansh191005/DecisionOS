"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export interface TimeSeriesMetadataResponse {
  date_columns: string[];
  numeric_columns: string[];
}

export interface ForecastRequest {
  date_column: string;
  target_column: string;
  agg_fn: "SUM" | "AVG" | "COUNT" | "MAX" | "MIN";
  horizon: number;
  frequency: "D" | "W" | "M" | "Q" | "Y";
  model_type: "AUTO" | "ETS" | "ARIMA" | "LINEAR_TREND";
}

export interface ForecastDataPoint {
  date: string;
  actual_value: number | null;
  forecast_value: number | null;
  lower_80: number | null;
  upper_80: number | null;
  lower_95: number | null;
  upper_95: number | null;
  is_forecast: boolean;
}

export interface ForecastAccuracyMetrics {
  mape: number;
  rmse: number;
  mae: number;
  model_type_used: string;
  seasonality_detected: boolean;
}

export interface AIInsightBrief {
  id: string;
  category: "DRIVER" | "RISK" | "PARETO" | "ANOMALY" | "INFO";
  title: string;
  description: string;
  metric_badge: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
}

export interface ForecastResponse {
  dataset_id: string;
  dataset_name: string;
  date_column: string;
  target_column: string;
  frequency: string;
  horizon: number;
  model_type_used: string;
  metrics: ForecastAccuracyMetrics;
  data_points: ForecastDataPoint[];
  ai_brief: AIInsightBrief;
}

export interface WhatIfAdjustment {
  driver_column: string;
  percentage_change: number;
  elasticity: number;
}

export interface WhatIfScenarioRequest {
  target_column: string;
  base_forecast_data_points: ForecastDataPoint[];
  trend_multiplier: number;
  step_change_pct: number;
  adjustments: WhatIfAdjustment[];
}

export interface ScenarioComparisonPoint {
  date: string;
  baseline_value: number;
  simulated_value: number;
  delta_value: number;
  delta_percentage: number;
  is_forecast: boolean;
}

export interface WhatIfScenarioResponse {
  dataset_id: string;
  dataset_name: string;
  target_column: string;
  baseline_total: number;
  simulated_total: number;
  net_delta: number;
  net_percentage: number;
  comparison_series: ScenarioComparisonPoint[];
  ai_recommendation: AIInsightBrief;
}

export function useForecastingMetadata(
  workspaceSlug: string,
  datasetId: string,
  enabled: boolean = true
) {
  return useQuery<TimeSeriesMetadataResponse, Error>({
    queryKey: ["forecastingMetadata", workspaceSlug, datasetId],
    queryFn: async () => {
      const response = await apiClient.get<TimeSeriesMetadataResponse>(
        `/workspaces/${workspaceSlug}/datasets/${datasetId}/forecasting/metadata`
      );
      return response.data;
    },
    enabled: Boolean(workspaceSlug && datasetId && enabled),
    staleTime: 5 * 60 * 1000,
  });
}

export function useGenerateForecast(
  workspaceSlug: string,
  datasetId: string
) {
  return useMutation<ForecastResponse, Error, ForecastRequest>({
    mutationFn: async (request: ForecastRequest) => {
      const response = await apiClient.post<ForecastResponse>(
        `/workspaces/${workspaceSlug}/datasets/${datasetId}/forecasting/forecast`,
        request
      );
      return response.data;
    },
  });
}

export function useRunWhatIfScenario(
  workspaceSlug: string,
  datasetId: string
) {
  return useMutation<WhatIfScenarioResponse, Error, WhatIfScenarioRequest>({
    mutationFn: async (request: WhatIfScenarioRequest) => {
      const response = await apiClient.post<WhatIfScenarioResponse>(
        `/workspaces/${workspaceSlug}/datasets/${datasetId}/forecasting/what-if`,
        request
      );
      return response.data;
    },
  });
}
