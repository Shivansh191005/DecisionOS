"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpDown,
  BarChart2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Code2,
  Database,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  Play,
  Table,
} from "lucide-react";

import {
  useDataset,
  useDatasetPreview,
  useDatasetQuery,
} from "@/hooks/use-datasets";

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export default function DatasetInspectorPage() {
  const params = useParams();
  const workspaceSlug = params?.workspaceSlug as string;
  const datasetId = params?.datasetId as string;

  const [activeTab, setActiveTab] = useState<"schema" | "preview" | "query">(
    "schema"
  );

  // Preview tab pagination and sorting state
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // SQL query state
  const [sqlInput, setSqlInput] = useState(
    "SELECT * FROM dataset LIMIT 25;"
  );
  const [queryResult, setQueryResult] = useState<any | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  const {
    data: dataset,
    isLoading: isLoadingDataset,
    error: datasetError,
  } = useDataset(workspaceSlug, datasetId);

  const {
    data: preview,
    isLoading: isLoadingPreview,
  } = useDatasetPreview(
    workspaceSlug,
    datasetId,
    limit,
    offset,
    sortBy,
    sortOrder
  );

  const queryMutation = useDatasetQuery(workspaceSlug, datasetId);

  const handleSortColumn = (colName: string) => {
    if (sortBy === colName) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(colName);
      setSortOrder("asc");
    }
  };

  const handleRunQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    setQueryError(null);
    setQueryResult(null);
    try {
      const result = await queryMutation.mutateAsync(sqlInput);
      setQueryResult(result);
    } catch (err: any) {
      setQueryError(
        err.response?.data?.message || err.message || "Query failed"
      );
    }
  };

  if (isLoadingDataset) {
    return (
      <div className="min-h-screen bg-slate-950 p-10 flex items-center justify-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2 text-indigo-400" />
        <span>Loading dataset inspector...</span>
      </div>
    );
  }

  if (datasetError || !dataset) {
    return (
      <div className="min-h-screen bg-slate-950 p-10 text-white">
        <div className="bg-red-950/40 border border-red-500/30 rounded-2xl p-8 max-w-lg mx-auto text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold">Dataset Not Found</h2>
          <p className="text-sm text-red-200 mt-1">
            Unable to load dataset metadata or schema profile.
          </p>
          <Link
            href={`/dashboard/${workspaceSlug}/ingest`}
            className="inline-block mt-6 px-4 py-2 rounded-lg bg-slate-800 text-sm font-medium hover:bg-slate-700 transition"
          >
            Back to Ingestion Studio
          </Link>
        </div>
      </div>
    );
  }

  const columns = dataset.schema_metadata?.columns || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 p-6 md:p-10 text-white space-y-8">
      {/* Top Breadcrumbs & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <Link
            href={`/dashboard/${workspaceSlug}/ingest`}
            className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Ingestion Studio</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              {dataset.name}
            </h1>
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              {dataset.file_type}
            </span>
            {dataset.status === "READY" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                READY
              </span>
            )}
          </div>
          <p className="text-slate-400 text-sm mt-1 font-mono">
            {dataset.file_name} • {formatBytes(dataset.file_size_bytes)} •{" "}
            {dataset.row_count !== null ? `${dataset.row_count?.toLocaleString()} rows` : "—"} •{" "}
            {dataset.column_count !== null ? `${dataset.column_count} columns` : "—"}
          </p>
        </div>

        {/* Tab Selection Pill Bar */}
        <div className="flex items-center bg-slate-900/80 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("schema")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === "schema"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Schema Scorecard</span>
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === "preview"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>DuckDB Data Preview</span>
          </button>
          <button
            onClick={() => setActiveTab("query")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === "query"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>SQL Analytics Studio</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SCHEMA SCORECARD */}
      {activeTab === "schema" && (
        <div className="space-y-6">
          {/* Executive Overview KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Rows
              </p>
              <p className="text-2xl font-bold text-white mt-1">
                {dataset.row_count?.toLocaleString() ?? 0}
              </p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Columns
              </p>
              <p className="text-2xl font-bold text-white mt-1">
                {dataset.column_count ?? 0}
              </p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Numeric Columns
              </p>
              <p className="text-2xl font-bold text-indigo-400 mt-1">
                {columns.filter((c) => c.semantic_type === "NUMERIC").length}
              </p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Categorical Columns
              </p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">
                {columns.filter((c) => c.semantic_type === "CATEGORICAL").length}
              </p>
            </div>
          </div>

          {/* Column Profile Scorecard Grid */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">
                Automated Schema Profiling Scorecard
              </h2>
              <p className="text-slate-400 text-sm mt-0.5">
                Inferred semantic data types, missing value percentages, and statistical summary metrics.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="px-6 py-4">Column Name</th>
                    <th className="px-6 py-4">Semantic Type</th>
                    <th className="px-6 py-4">Data Type</th>
                    <th className="px-6 py-4">Missing / Null %</th>
                    <th className="px-6 py-4">Unique Count</th>
                    <th className="px-6 py-4">Sample Values</th>
                    <th className="px-6 py-4">Summary Stats</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {columns.map((col, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4 font-semibold text-white font-mono">
                        {col.name}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                            col.semantic_type === "NUMERIC"
                              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                              : col.semantic_type === "CATEGORICAL"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : col.semantic_type === "DATETIME"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-slate-800 text-slate-300 border-slate-700"
                          }`}
                        >
                          {col.semantic_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">
                        {col.data_type}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold ${
                              col.null_percentage > 10
                                ? "text-red-400"
                                : col.null_percentage > 0
                                ? "text-amber-400"
                                : "text-emerald-400"
                            }`}
                          >
                            {col.null_percentage}%
                          </span>
                          <span className="text-xs text-slate-500">
                            ({col.null_count})
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-300">
                        {col.unique_count}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {col.sample_values.slice(0, 3).map((val, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded bg-slate-800/80 text-xs font-mono text-slate-300 truncate max-w-[120px]"
                            >
                              {val}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-300">
                        {col.semantic_type === "NUMERIC" && col.min !== undefined ? (
                          <div className="space-y-0.5">
                            <div>
                              min: <span className="text-indigo-300">{col.min}</span> • max:{" "}
                              <span className="text-indigo-300">{col.max}</span>
                            </div>
                            <div>
                              mean: <span className="text-indigo-300">{col.mean}</span> • std:{" "}
                              <span className="text-indigo-300">{col.std}</span>
                            </div>
                          </div>
                        ) : col.semantic_type === "CATEGORICAL" &&
                          col.top_category !== undefined ? (
                          <div>
                            top: <span className="text-emerald-300">{col.top_category}</span>{" "}
                            ({col.top_category_freq})
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE DUCKDB DATA PREVIEW */}
      {activeTab === "preview" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400 font-medium">Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setOffset(0);
                }}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={20}>20 rows</option>
                <option value={50}>50 rows</option>
                <option value={100}>100 rows</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">
                Showing rows {offset + 1} -{" "}
                {Math.min(offset + limit, preview?.total_rows || 0)} of{" "}
                {preview?.total_rows?.toLocaleString() || 0}
              </span>
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={!preview || offset + limit >= preview.total_rows}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
            {isLoadingPreview ? (
              <div className="flex items-center justify-center py-20 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2 text-indigo-400" />
                <span>Executing DuckDB vectorized query preview...</span>
              </div>
            ) : !preview || preview.rows.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                No rows available to display.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      {preview.columns.map((colName) => (
                        <th
                          key={colName}
                          onClick={() => handleSortColumn(colName)}
                          className="px-6 py-3.5 cursor-pointer hover:text-white transition select-none"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{colName}</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-500" />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm font-mono">
                    {preview.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className="hover:bg-slate-800/40 transition"
                      >
                        {preview.columns.map((colName) => (
                          <td key={colName} className="px-6 py-3 text-slate-300">
                            {row[colName] !== null && row[colName] !== undefined
                              ? String(row[colName])
                              : "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SQL ANALYTICS STUDIO */}
      {activeTab === "query" && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Code2 className="w-5 h-5 text-indigo-400" />
              DuckDB SQL OLAP Query Studio
            </h2>
            <p className="text-slate-400 text-sm mb-4">
              Write analytical SELECT aggregations over your dataset. Reference the dataset as{" "}
              <code className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono">
                dataset
              </code>
              .
            </p>

            <form onSubmit={handleRunQuery} className="space-y-4">
              <textarea
                rows={4}
                value={sqlInput}
                onChange={(e) => setSqlInput(e.target.value)}
                placeholder="SELECT semantic_type, COUNT(*) FROM dataset GROUP BY 1"
                className="w-full font-mono text-sm bg-slate-950 border border-slate-800 rounded-xl p-4 text-indigo-200 focus:outline-none focus:border-indigo-500"
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Examples:</span>
                  <button
                    type="button"
                    onClick={() => setSqlInput("SELECT * FROM dataset LIMIT 10;")}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  >
                    Sample Rows
                  </button>
                  {columns.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setSqlInput(
                          `SELECT "${columns[0].name}", COUNT(*) as cnt FROM dataset GROUP BY 1 ORDER BY 2 DESC LIMIT 10;`
                        )
                      }
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    >
                      Top Category Frequency
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={queryMutation.isPending}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-lg shadow-indigo-600/30 disabled:opacity-50 flex items-center gap-2 transition"
                >
                  {queryMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Executing OLAP Query...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Run SQL Query</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {queryError && (
              <div className="mt-6 p-4 rounded-xl bg-red-950/50 border border-red-500/30 flex items-center gap-3 text-red-300 text-sm">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <span>{queryError}</span>
              </div>
            )}
          </div>

          {/* SQL Query Results Table */}
          {queryResult && (
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">
                  Query Results ({queryResult.row_count} rows)
                </span>
                <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md">
                  {queryResult.sql_executed}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      {queryResult.columns.map((colName: string) => (
                        <th key={colName} className="px-6 py-3.5">
                          {colName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm font-mono">
                    {queryResult.rows.map((row: any, rIdx: number) => (
                      <tr
                        key={rIdx}
                        className="hover:bg-slate-800/40 transition"
                      >
                        {queryResult.columns.map((colName: string) => (
                          <td key={colName} className="px-6 py-3 text-slate-300">
                            {row[colName] !== null && row[colName] !== undefined
                              ? String(row[colName])
                              : "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
