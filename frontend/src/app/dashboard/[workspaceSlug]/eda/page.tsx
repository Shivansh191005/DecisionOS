"use client";

import React, { use } from "react";
import Link from "next/link";
import {
  BarChart3,
  Sparkles,
  Database,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Activity,
  Layers,
} from "lucide-react";
import { useDatasets, Dataset } from "@/hooks/use-datasets";

interface EDAHubProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default function EDAHubPage({ params }: EDAHubProps) {
  const resolvedParams = use(params);
  const workspaceSlug = resolvedParams.workspaceSlug;

  const { data: datasets, isLoading, error } = useDatasets(workspaceSlug);

  const calculateEDAReadinessBadge = (dataset: Dataset) => {
    const cols = dataset.schema_metadata?.columns || [];
    const numCols = cols.filter((c) => c.semantic_type === "NUMERIC");
    if (!cols.length) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 px-2.5 py-1 text-xs font-medium text-slate-400">
          Unprofiled
        </span>
      );
    }
    if (numCols.length >= 2) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-400 border border-indigo-500/20">
          <Activity className="h-3.5 w-3.5" />
          EDA Ready ({numCols.length} KPIs)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 px-2.5 py-1 text-xs font-medium text-slate-400 border border-slate-500/20">
        <Layers className="h-3.5 w-3.5" />
        Categorical Focused
      </span>
    );
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Exploratory Data Analysis (EDA) & Auto-Insights
            </h1>
          </div>
          <p className="mt-2 text-sm text-slate-400 max-w-2xl">
            Instantly compute Pearson correlation matrices, flag multicollinearity, inspect univariate histograms & boxplots, detect Tukey IQR outliers, and receive automated natural language executive briefings.
          </p>
        </div>
      </div>

      {/* Hero Stats Card */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Vectorized Correlation Matrix
            </span>
            <TrendingUp className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="mt-3 text-2xl font-bold text-white">DuckDB CORR(x,y)</p>
          <p className="mt-1 text-xs text-slate-400">
            Sub-millisecond Pearson collinearity detection (|r| ≥ 0.85).
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Tukey IQR & Z-Score Outliers
            </span>
            <AlertCircle className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-3 text-2xl font-bold text-white">Anomaly Engine</p>
          <p className="mt-1 text-xs text-slate-400">
            Row-level deviation inspectability with quartile boundaries.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              ThoughtSpot Executive Briefs
            </span>
            <Sparkles className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-3 text-2xl font-bold text-white">AI Storytelling</p>
          <p className="mt-1 text-xs text-slate-400">
            Automated narrative cards for KPI drivers & Pareto 80/20 dominance.
          </p>
        </div>
      </div>

      {/* Dataset Selection Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Select Dataset for EDA & Auto-Insights Studio
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose an ingested dataset to explore statistical relationships and natural language briefings.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            Loading datasets from workspace...
          </div>
        ) : error ? (
          <div className="py-16 text-center text-rose-400 text-sm">
            Failed to load datasets. Please verify workspace connection.
          </div>
        ) : !datasets || datasets.length === 0 ? (
          <div className="py-16 text-center">
            <Database className="mx-auto h-12 w-12 text-slate-600 mb-3" />
            <p className="text-sm text-slate-300 font-medium">No datasets available</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Upload a CSV, Excel, or Parquet file in the Data Ingestion Studio first.
            </p>
            <Link
              href={`/dashboard/${workspaceSlug}/ingest`}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20"
            >
              Go to Ingestion Studio
            </Link>
          </div>
        ) : (
          <div className="mt-6 divide-y divide-slate-800/80">
            {datasets.map((dataset) => {
              const numCols =
                dataset.schema_metadata?.columns?.filter(
                  (c) => c.semantic_type === "NUMERIC"
                ).length || 0;
              const catCols =
                dataset.schema_metadata?.columns?.filter(
                  (c) => c.semantic_type === "CATEGORICAL"
                ).length || 0;

              return (
                <div
                  key={dataset.id}
                  className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-4 hover:bg-slate-800/40 px-4 rounded-xl transition"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
                      <Database className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        {dataset.name}
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          {dataset.file_type}
                        </span>
                      </h3>
                      <div className="mt-1 flex items-center gap-4 text-xs text-slate-400">
                        <span>{(dataset.row_count || 0).toLocaleString()} rows</span>
                        <span>•</span>
                        <span>{dataset.column_count} columns</span>
                        <span>•</span>
                        <span>
                          {numCols} numerical, {catCols} categorical
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end md:self-center">
                    {calculateEDAReadinessBadge(dataset)}

                    <Link
                      href={`/dashboard/${workspaceSlug}/eda/${dataset.id}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 px-4 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-600 hover:text-white transition shadow-sm"
                    >
                      <span>Launch EDA Studio</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
