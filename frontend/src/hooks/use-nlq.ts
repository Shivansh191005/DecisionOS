"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export interface NLQAskRequest {
  question: string;
}

export interface NLQAskResponse {
  question: string;
  generated_sql: string;
  execution_time_ms: number;
  recommended_chart_type: "LINE_CHART" | "BAR_CHART" | "PIE_CHART" | "KPI_CARD" | "DATA_TABLE" | string;
  columns: string[];
  rows: Record<string, any>[];
  ai_answer: string;
}

export interface NLQBookmarkCreate {
  question: string;
  generated_sql: string;
  chart_type: string;
}

export interface NLQBookmarkResponse {
  id: string;
  dataset_id: string;
  workspace_id: string;
  question: string;
  generated_sql: string;
  chart_type: string;
  created_at: string;
}

export function useAskNLQ(workspaceSlug: string, datasetId: string) {
  return useMutation({
    mutationFn: async (payload: NLQAskRequest): Promise<NLQAskResponse> => {
      const response = await apiClient.post<NLQAskResponse>(
        `/workspaces/${workspaceSlug}/datasets/${datasetId}/nlq/ask`,
        payload
      );
      return response.data;
    },
  });
}

export function useNLQBookmarks(workspaceSlug: string, datasetId: string) {
  return useQuery({
    queryKey: ["nlq-bookmarks", workspaceSlug, datasetId],
    queryFn: async (): Promise<NLQBookmarkResponse[]> => {
      const response = await apiClient.get<NLQBookmarkResponse[]>(
        `/workspaces/${workspaceSlug}/datasets/${datasetId}/nlq/bookmarks`
      );
      return response.data;
    },
    enabled: Boolean(workspaceSlug && datasetId),
  });
}

export function useCreateNLQBookmark(workspaceSlug: string, datasetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: NLQBookmarkCreate): Promise<NLQBookmarkResponse> => {
      const response = await apiClient.post<NLQBookmarkResponse>(
        `/workspaces/${workspaceSlug}/datasets/${datasetId}/nlq/bookmarks`,
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["nlq-bookmarks", workspaceSlug, datasetId],
      });
    },
  });
}

export function useDeleteNLQBookmark(workspaceSlug: string, datasetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookmarkId: string): Promise<void> => {
      await apiClient.delete(
        `/workspaces/${workspaceSlug}/datasets/${datasetId}/nlq/bookmarks/${bookmarkId}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["nlq-bookmarks", workspaceSlug, datasetId],
      });
    },
  });
}
