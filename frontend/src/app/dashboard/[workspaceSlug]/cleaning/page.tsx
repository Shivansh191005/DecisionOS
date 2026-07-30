"use client";

import React, { use } from "react";
import Link from "next/link";
import {
  Wand2,
  Sparkles,
  Database,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { useDatasets, Dataset } from "@/hooks/use-datasets";

interface CleaningHubProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default function CleaningHubPage({ params }: CleaningHubProps) {
  const resolvedParams = use(params);
  const workspaceSlug = resolvedParams.workspaceSlug;

  const { data: datasets, isLoading, error } = useDatasets(workspaceSlug);

  const calculateQualityBadge = (dataset: Dataset) => {
    const cols = dataset.schema_metadata?.columns || [];
    if (!cols.length) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 px-2.5 py-1 text-xs font-medium text-slate-400">
          Unknown
        </span>
      );
    }
    const totalNulls = cols.reduce((sum, c) => sum + (c.null_count || 0), 0);
    if (totalNulls === 0) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="h-3.5 w-3.5" />
          100% Clean (0 Nulls)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400 border border-amber-500/20">
        <AlertTriangle className="h-3.5 w-3.5" />
        Needs Imputation ({totalNulls} Nulls)
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-8 border border-slate-800 shadow-2xl">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
              <Sparkles className="h-3.5 w-3.5" />
              Non-Destructive DuckDB Transformation Pipelines
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Data Cleaning & Feature Engineering Studio
            </h1>
            <p className="text-sm text-slate-300">
              Build reversible transformation recipes, impute missing values with AI
              recommendations, filter outliers, and engineer derived columns at
              sub-millisecond vectorized DuckDB speed.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/${workspaceSlug}/ingest`}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800/80 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors border border-slate-700"
            >
              <Database className="h-4 w-4" />
              Upload New Dataset
            </Link>
          </div>
        </div>
      </div>

      {/* Datasets Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Workspace Datasets</h2>
            <p className="text-xs text-slate-400">
              Select a dataset below to open the interactive transformation studio
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Zero Raw File Mutation
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            Failed to load datasets. Please ensure your backend is running.
          </div>
        ) : !datasets || datasets.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 py-16 text-center">
            <Database className="h-10 w-10 text-slate-600 mb-3" />
            <h3 className="text-sm font-medium text-slate-300">No Datasets Found</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm">
              Upload a CSV, Excel, JSON, or Parquet file in the Data Ingestion Studio to
              begin cleaning and feature engineering.
            </p>
            <Link
              href={`/dashboard/${workspaceSlug}/ingest`}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              Go to Data Ingestion
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="pb-3 pl-4">Dataset Name</th>
                  <th className="pb-3">Format</th>
                  <th className="pb-3">Rows</th>
                  <th className="pb-3">Columns</th>
                  <th className="pb-3">Data Quality Status</th>
                  <th className="pb-3 text-right pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {datasets.map((ds) => (
                  <tr key={ds.id} className="group hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 pl-4 font-medium text-white">
                      {ds.name}
                      <div className="text-xs text-slate-500 font-normal">
                        {ds.file_name}
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-300 border border-slate-700">
                        {ds.file_type}
                      </span>
                    </td>
                    <td className="py-4 font-mono text-slate-300">
                      {ds.row_count?.toLocaleString() || 0}
                    </td>
                    <td className="py-4 font-mono text-slate-300">
                      {ds.column_count || 0}
                    </td>
                    <td className="py-4">{calculateQualityBadge(ds)}</td>
                    <td className="py-4 text-right pr-4">
                      <Link
                        href={`/dashboard/${workspaceSlug}/cleaning/${ds.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600/20 px-3 py-1.5 text-xs font-semibold text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all border border-indigo-500/30"
                      >
                        <Wand2 className="h-3.5 w-3.5" />
                        Launch Studio
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
