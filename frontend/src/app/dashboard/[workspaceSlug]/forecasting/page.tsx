"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  TrendingUp,
  LineChart,
  Sliders,
  Calendar,
  Sparkles,
  ArrowRight,
  Database,
  Activity,
  Layers,
} from "lucide-react";
import { useDatasets } from "@/hooks/use-datasets";

export default function ForecastingHubPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params.workspaceSlug as string;

  const { data: datasets, isLoading, isError } = useDatasets(workspaceSlug);

  return (
    <div className="space-y-8 p-8">
      {/* Executive SaaS Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold uppercase tracking-wider mb-2">
            <TrendingUp className="h-4 w-4" />
            Decision Intelligence & Multi-Model Forecasting
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Automated Time-Series Forecasting & What-If Studio
          </h1>
          <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
            Project future KPI trajectories with Holt-Winters Exponential Smoothing, ARIMA, and Linear Trend
            models. Evaluate 80% and 95% confidence bounds and simulate interactive What-If scenario interventions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-indigo-950/50 border border-indigo-500/30 rounded-lg px-4 py-2.5">
            <Sparkles className="h-4 w-4 text-indigo-400 animate-pulse" />
            <span className="text-xs font-medium text-indigo-200">
              DuckDB Vectorized Resampling • AUTO Best-Fit Model Selection
            </span>
          </div>
        </div>
      </div>

      {/* KPI Feature Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              Time-Series Engine
            </span>
            <LineChart className="h-5 w-5 text-indigo-400" />
          </div>
          <h3 className="text-lg font-bold text-white">Multi-Model Auto-Select</h3>
          <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
            Automatically compares MAPE and RMSE error across ETS, ARIMA, and Linear Trend algorithms to pick the most accurate forecast model.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Risk Bounds
            </span>
            <Activity className="h-5 w-5 text-emerald-400" />
          </div>
          <h3 className="text-lg font-bold text-white">80% & 95% Confidence Bands</h3>
          <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
            Quantify prediction uncertainty with statistically rigorous lower and upper confidence intervals that scale dynamically across the horizon.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
              Decision Simulator
            </span>
            <Sliders className="h-5 w-5 text-purple-400" />
          </div>
          <h3 className="text-lg font-bold text-white">What-If Scenario Modeling</h3>
          <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
            Simulate business interventions with elasticity driver sliders, immediate step changes, and trend growth multipliers.
          </p>
        </div>
      </div>

      {/* Dataset Selection Scorecards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-400" />
            Select Dataset for Forecasting & Decision Simulation
          </h2>
          <span className="text-xs text-slate-500">
            {datasets?.length || 0} workspaces dataset{(datasets?.length || 0) !== 1 ? "s" : ""} available
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-44 rounded-xl bg-slate-900/50 border border-slate-800/60 animate-pulse"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="bg-red-950/30 border border-red-500/40 rounded-xl p-6 text-center text-red-300">
            Failed to load workspace datasets. Please refresh or verify workspace permissions.
          </div>
        ) : datasets?.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center">
            <Layers className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white">No datasets uploaded yet</h3>
            <p className="text-slate-400 text-sm mt-1 mb-6">
              Upload a CSV, Excel, or Parquet dataset with a datetime index column to start forecasting.
            </p>
            <button
              onClick={() => router.push(`/dashboard/${workspaceSlug}/ingest`)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors inline-flex items-center gap-2 shadow-lg shadow-indigo-600/30"
            >
              Upload Dataset Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {datasets?.map((ds) => (
              <div
                key={ds.id}
                onClick={() => router.push(`/dashboard/${workspaceSlug}/forecasting/${ds.id}`)}
                className="group cursor-pointer bg-slate-900/70 border border-slate-800/80 hover:border-indigo-500/50 rounded-xl p-6 transition-all duration-200 shadow-sm hover:shadow-xl hover:shadow-indigo-950/40 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      <Calendar className="h-3.5 w-3.5" />
                      Time-Series Ready
                    </span>
                    <span className="text-xs font-mono text-slate-500 uppercase">
                      {ds.file_type}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors truncate">
                    {ds.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 truncate">
                    File: {ds.file_name}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-3 pt-4 border-t border-slate-800/60 text-xs">
                    <div>
                      <div className="text-slate-500">Rows</div>
                      <div className="font-semibold text-slate-300 mt-0.5">
                        {ds.row_count ? ds.row_count.toLocaleString() : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Columns</div>
                      <div className="font-semibold text-slate-300 mt-0.5">
                        {ds.column_count || "—"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
                    Launch Studio
                  </span>
                  <div className="w-8 h-8 rounded-full bg-slate-800 group-hover:bg-indigo-600/30 flex items-center justify-center transition-colors">
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-300" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
