"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useAppStore } from "@/store/use-app-store";

export interface ColumnProfile {
  name: string;
  semantic_type: "NUMERIC" | "CATEGORICAL" | "DATETIME" | "BOOLEAN" | "TEXT";
  data_type: string;
  null_count: number;
  null_percentage: number;
  unique_count: number;
  sample_values: string[];
  min?: number | null;
  max?: number | null;
  mean?: number | null;
  std?: number | null;
  top_category?: string;
  top_category_freq?: number;
}

export interface SchemaMetadata {
  row_count: number;
  column_count: number;
  columns: ColumnProfile[];
}

export interface Dataset {
  id: string;
  workspace_id: string;
  name: string;
  file_name: string;
  file_size_bytes: number;
  file_type: "CSV" | "EXCEL" | "JSON" | "PARQUET";
  row_count?: number | null;
  column_count?: number | null;
  schema_metadata?: SchemaMetadata | null;
  status: "UPLOADING" | "PROCESSING" | "READY" | "ERROR";
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatasetPreview {
  columns: string[];
  rows: Record<string, any>[];
  total_rows: number;
  limit: number;
  offset: number;
}

export interface DatasetQueryResponse {
  columns: string[];
  rows: Record<string, any>[];
  row_count: number;
  sql_executed: string;
}

export function useDatasets(workspaceSlug: string) {
  const { activeOrganization } = useAppStore();

  return useQuery<Dataset[]>({
    queryKey: ["datasets", workspaceSlug, activeOrganization?.id],
    queryFn: async () => {
      if (!workspaceSlug || !activeOrganization) return [];
      const { data } = await apiClient.get<Dataset[]>(
        `/workspaces/${workspaceSlug}/datasets`,
        {
          headers: { "X-Organization-Id": activeOrganization.id },
        }
      );
      return data;
    },
    enabled: !!workspaceSlug && !!activeOrganization?.id,
  });
}

export function useDataset(workspaceSlug: string, datasetId?: string) {
  const { activeOrganization } = useAppStore();

  return useQuery<Dataset>({
    queryKey: ["dataset", workspaceSlug, datasetId, activeOrganization?.id],
    queryFn: async () => {
      if (!workspaceSlug || !datasetId || !activeOrganization) {
        throw new Error("Missing parameters");
      }
      const { data } = await apiClient.get<Dataset>(
        `/workspaces/${workspaceSlug}/datasets/${datasetId}`,
        {
          headers: { "X-Organization-Id": activeOrganization.id },
        }
      );
      return data;
    },
    enabled: !!workspaceSlug && !!datasetId && !!activeOrganization?.id,
  });
}

export function useDatasetPreview(
  workspaceSlug: string,
  datasetId?: string,
  limit = 50,
  offset = 0,
  sortBy?: string,
  sortOrder: "asc" | "desc" = "asc"
) {
  const { activeOrganization } = useAppStore();

  return useQuery<DatasetPreview>({
    queryKey: [
      "datasetPreview",
      workspaceSlug,
      datasetId,
      limit,
      offset,
      sortBy,
      sortOrder,
      activeOrganization?.id,
    ],
    queryFn: async () => {
      if (!workspaceSlug || !datasetId || !activeOrganization) {
        throw new Error("Missing parameters");
      }
      const params: Record<string, any> = { limit, offset, sort_order: sortOrder };
      if (sortBy) params.sort_by = sortBy;

      const { data } = await apiClient.get<DatasetPreview>(
        `/workspaces/${workspaceSlug}/datasets/${datasetId}/preview`,
        {
          params,
          headers: { "X-Organization-Id": activeOrganization.id },
        }
      );
      return data;
    },
    enabled: !!workspaceSlug && !!datasetId && !!activeOrganization?.id,
  });
}

export function useUploadDataset(workspaceSlug: string) {
  const queryClient = useQueryClient();
  const { activeOrganization } = useAppStore();

  return useMutation({
    mutationFn: async ({
      file,
      datasetName,
    }: {
      file: File;
      datasetName?: string;
    }) => {
      if (!activeOrganization) {
        throw new Error("No active organization selected");
      }
      const formData = new FormData();
      formData.append("file", file);
      if (datasetName) {
        formData.append("dataset_name", datasetName);
      }

      const { data } = await apiClient.post<Dataset>(
        `/workspaces/${workspaceSlug}/datasets`,
        formData,
        {
          headers: {
            "X-Organization-Id": activeOrganization.id,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["datasets", workspaceSlug],
      });
    },
  });
}

export function useDeleteDataset(workspaceSlug: string) {
  const queryClient = useQueryClient();
  const { activeOrganization } = useAppStore();

  return useMutation({
    mutationFn: async (datasetId: string) => {
      if (!activeOrganization) {
        throw new Error("No active organization selected");
      }
      await apiClient.delete(
        `/workspaces/${workspaceSlug}/datasets/${datasetId}`,
        {
          headers: { "X-Organization-Id": activeOrganization.id },
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["datasets", workspaceSlug],
      });
    },
  });
}

export function useDatasetQuery(workspaceSlug: string, datasetId: string) {
  const { activeOrganization } = useAppStore();

  return useMutation({
    mutationFn: async (sqlQuery: string) => {
      if (!activeOrganization) {
        throw new Error("No active organization selected");
      }
      const { data } = await apiClient.post<DatasetQueryResponse>(
        `/workspaces/${workspaceSlug}/datasets/${datasetId}/query`,
        { sql_query: sqlQuery },
        {
          headers: { "X-Organization-Id": activeOrganization.id },
        }
      );
      return data;
    },
  });
}
