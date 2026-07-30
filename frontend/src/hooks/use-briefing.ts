"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export interface BriefingRequest {
  title?: string;
  target_column?: string;
  include_forecasting: boolean;
  include_xai: boolean;
  include_optimization: boolean;
  executive_notes?: string;
}

export interface BriefingSection {
  section_id: string;
  title: string;
  badge_text: string;
  summary_text: string;
  metrics: Record<string, any>;
  recommendation?: string;
}

export interface BriefingResponse {
  briefing_id: string;
  dataset_id: string;
  dataset_name: string;
  title: string;
  generated_at: string;
  executive_memo_markdown: string;
  sections: BriefingSection[];
  overall_health_score: number;
  execution_time_ms: number;
}

export interface BriefingQnaRequest {
  question: string;
  target_column?: string;
  context_section?: string;
}

export interface BriefingQnaResponse {
  question: string;
  answer_text: string;
  supporting_metric: string;
  confidence_score: number;
}

export function useGenerateBriefing(workspaceSlug: string, datasetId: string) {
  return useMutation({
    mutationFn: async (payload: BriefingRequest): Promise<BriefingResponse> => {
      const response = await apiClient.post<BriefingResponse>(
        `/workspaces/${workspaceSlug}/datasets/${datasetId}/briefing/generate`,
        payload
      );
      return response.data;
    },
  });
}

export function useBriefingQna(workspaceSlug: string, datasetId: string) {
  return useMutation({
    mutationFn: async (
      payload: BriefingQnaRequest
    ): Promise<BriefingQnaResponse> => {
      const response = await apiClient.post<BriefingQnaResponse>(
        `/workspaces/${workspaceSlug}/datasets/${datasetId}/briefing/qna`,
        payload
      );
      return response.data;
    },
  });
}
