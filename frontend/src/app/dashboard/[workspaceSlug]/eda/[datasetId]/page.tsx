"use client";

import React, { use, useState, useMemo } from "react";
import Link from "next/link";
import {
  BarChart3,
  Sparkles,
  Database,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  SlidersHorizontal,
  Table as TableIcon,
  Layers,
  Activity,
  Filter,
} from "lucide-react";
import { useDataset, Dataset } from "@/hooks/use-datasets";
import {
  useCorrelationMatrix,
  useColumnDistribution,
  useColumnOutliers,
  useEDAInsights,
  AutoInsightItem,
} from "@/hooks/use-eda";

interface EDAStudioProps {
  params: Promise<{ workspaceSlug: string; datasetId: string }>;
}

export default function EDAStudioPage({ params }: EDAStudioProps) {
  const resolvedParams = use(params);
  const { workspaceSlug, datasetId } = resolvedParams;

  const [activeTab, setActiveTab] = useState<
    "briefing" | "correlations" | "distributions" | "outliers"
  >("briefing");

  // Fetch Dataset metadata
  const { data: dataset, isLoading: isDsLoading } = useDataset(
    workspaceSlug,
    datasetId
  );

  // Derive numeric columns for selector
  const numericColumns = useMemo(() => {
    if (!dataset?.schema_metadata?.columns) return [];
    return dataset.schema_metadata.columns
      .filter((c) => c.semantic_type === "NUMERIC")
      .map((c) => c.name);
  }, [dataset]);

  const [selectedColumn, setSelectedColumn] = useState<string>("");

  // Set default selected column once numeric columns load
  React.useEffect(() => {
    if (numericColumns.length > 0 && !selectedColumn) {
      setSelectedColumn(numericColumns[0]);
    }
  }, [numericColumns, selectedColumn]);

  const [outlierMethod, setOutlierMethod] = useState<"IQR" | "ZSCORE">("IQR");

  // TanStack Query hooks for Module 4 EDA
  const { data: insightsData, isLoading: isInsightsLoading } = useEDAInsights(
    workspaceSlug,
    datasetId
  );

  const { data: corrData, isLoading: isCorrLoading } = useCorrelationMatrix(
    workspaceSlug,
    datasetId
  );

  const { data: distData, isLoading: isDistLoading } = useColumnDistribution(
    workspaceSlug,
    datasetId,
    selectedColumn || ""
  );

  const { data: outlierData, isLoading: isOutlierLoading } = useColumnOutliers(
    workspaceSlug,
    datasetId,
    selectedColumn || "",
    outlierMethod,
    30
  );

  const renderInsightCategoryBadge = (category: string) => {
    switch (category) {
      case "DRIVER":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
            <TrendingUp className="h-3 w-3" />
            KPI Driver
          </span>
        );
      case "RISK":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20">
            <AlertTriangle className="h-3 w-3" />
            Skewness Risk
          </span>
        );
      case "PARETO":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-400 border border-purple-500/20">
            <Layers className="h-3 w-3" />
            Pareto 80/20
          </span>
        );
      case "ANOMALY":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-400 border border-rose-500/20">
            <AlertCircle className="h-3 w-3" />
            Data Quality
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" />
            Overview
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard/${workspaceSlug}/eda`}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-white hover:border-slate-700 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                Exploratory Data Analysis Studio
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs font-mono text-slate-400">
                DuckDB Vectorized Engine
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 mt-0.5">
              {dataset?.name || "Dataset Studio"}
              {dataset?.file_type && (
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {dataset.file_type}
                </span>
              )}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/${workspaceSlug}/cleaning/${datasetId}`}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-800/80 border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Open in Cleaning Studio
          </Link>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-px">
        <button
          onClick={() => setActiveTab("briefing")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold rounded-t-xl transition border-b-2 ${
            activeTab === "briefing"
              ? "border-indigo-500 bg-indigo-500/10 text-white"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles className="h-4 w-4 text-indigo-400" />
          AI Executive Briefing
        </button>

        <button
          onClick={() => setActiveTab("correlations")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold rounded-t-xl transition border-b-2 ${
            activeTab === "correlations"
              ? "border-indigo-500 bg-indigo-500/10 text-white"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <TrendingUp className="h-4 w-4 text-indigo-400" />
          Correlations & Multicollinearity
          {corrData?.alerts && corrData.alerts.length > 0 && (
            <span className="ml-1 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">
              {corrData.alerts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("distributions")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold rounded-t-xl transition border-b-2 ${
            activeTab === "distributions"
              ? "border-indigo-500 bg-indigo-500/10 text-white"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <BarChart3 className="h-4 w-4 text-indigo-400" />
          Distributions & Skewness
        </button>

        <button
          onClick={() => setActiveTab("outliers")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold rounded-t-xl transition border-b-2 ${
            activeTab === "outliers"
              ? "border-indigo-500 bg-indigo-500/10 text-white"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <AlertCircle className="h-4 w-4 text-indigo-400" />
          Anomaly & Outlier Inspector
        </button>
      </div>

      {/* TAB 1: AI EXECUTIVE BRIEFING */}
      {activeTab === "briefing" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-900/30 via-slate-900/60 to-slate-900/60 p-6 backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  ThoughtSpot / Zoho Analytics-Style Executive Narrative Brief
                </h2>
                <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                  Our AI Auto-Insight Engine automatically scans your dataset for linear correlation drivers, distribution skewness risks, Pareto 80/20 dominance, and missing data concentrations, transforming statistical rigor into actionable business intelligence.
                </p>
              </div>
            </div>
          </div>

          {isInsightsLoading ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              Synthesizing executive narrative briefings...
            </div>
          ) : !insightsData || insightsData.insights.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
              <p className="text-sm text-slate-400">
                No automated insights available for this dataset.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {insightsData.insights.map((item: AutoInsightItem) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm flex flex-col justify-between hover:border-slate-700 transition"
                >
                  <div>
                    <div className="flex items-center justify-between gap-4">
                      {renderInsightCategoryBadge(item.category)}
                      <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {item.metric_badge}
                      </span>
                    </div>

                    <h3 className="mt-4 text-base font-bold text-white">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Generated by DecisionOS AI Auto-Insight Engine</span>
                    <span className="font-mono uppercase">Validated</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CORRELATIONS & MULTICOLLINEARITY */}
      {activeTab === "correlations" && (
        <div className="space-y-6">
          {/* Multicollinearity Alerts Bar */}
          {corrData?.alerts && corrData.alerts.length > 0 && (
            <div className="space-y-3">
              {corrData.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 flex items-start gap-4"
                >
                  <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-amber-300">
                      {alert.title}
                    </h3>
                    <p className="text-xs text-amber-200/80 mt-1">
                      {alert.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between pb-6 border-b border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Pearson Correlation Matrix & Collinearity Heatmap
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Vectorized calculation of linear relationships across all numeric columns.
                </p>
              </div>
            </div>

            {isCorrLoading ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                Calculating correlation matrix in DuckDB...
              </div>
            ) : !corrData || corrData.pairs.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                At least 2 numerical columns are required to compute a correlation matrix.
              </div>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-4">Feature X</th>
                      <th className="py-3 px-4">Feature Y</th>
                      <th className="py-3 px-4">Pearson r</th>
                      <th className="py-3 px-4">Linear Magnitude</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-sm">
                    {corrData.pairs.map((pair, idx) => {
                      const isPositive = pair.correlation >= 0;
                      const widthPct = Math.min(
                        Math.abs(pair.correlation) * 100,
                        100
                      );

                      return (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="py-3.5 px-4 font-mono font-medium text-white">
                            {pair.column_x}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-medium text-white">
                            {pair.column_y}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-indigo-400 font-semibold">
                            {pair.correlation}
                          </td>
                          <td className="py-3.5 px-4 w-64">
                            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isPositive
                                    ? "bg-indigo-500"
                                    : "bg-rose-500"
                                }`}
                                style={{ width: `${widthPct}%` }}
                              />
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {pair.is_collinear ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400 border border-amber-500/20">
                                Collinear Warning
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                                Independent
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DISTRIBUTIONS & SKEWNESS */}
      {activeTab === "distributions" && (
        <div className="space-y-6">
          {/* Column Selector Bar */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Select Numerical Feature:
              </span>
              <select
                value={selectedColumn}
                onChange={(e) => setSelectedColumn(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                {numericColumns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>

            {distData && (
              <div className="flex items-center gap-3">
                {distData.skewness_label === "HIGH_SKEW" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    High Skew ({distData.skewness})
                  </span>
                )}
                {distData.skewness_label === "MODERATE_SKEW" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
                    Moderate Skew ({distData.skewness})
                  </span>
                )}
                {distData.skewness_label === "SYMMETRIC" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Symmetric ({distData.skewness})
                  </span>
                )}
              </div>
            )}
          </div>

          {isDistLoading ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              Computing histogram binning and quartiles...
            </div>
          ) : !distData ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              Select a column to inspect its statistical distribution.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Boxplot Quartiles Panel */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  Boxplot Quartiles & Moments
                </h3>
                <div className="mt-6 space-y-4">
                  <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Minimum</span>
                    <span className="font-mono text-white font-semibold">
                      {distData.min}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                    <span className="text-slate-400">1st Quartile (Q1)</span>
                    <span className="font-mono text-indigo-400 font-semibold">
                      {distData.q1}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Median (Q2)</span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {distData.median}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                    <span className="text-slate-400">3rd Quartile (Q3)</span>
                    <span className="font-mono text-indigo-400 font-semibold">
                      {distData.q3}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Maximum</span>
                    <span className="font-mono text-white font-semibold">
                      {distData.max}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                    <span className="text-slate-400">IQR (Q3 - Q1)</span>
                    <span className="font-mono text-slate-200">
                      {distData.iqr}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Mean / Average</span>
                    <span className="font-mono text-slate-200">
                      {distData.mean}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Standard Deviation</span>
                    <span className="font-mono text-slate-200">
                      {distData.std}
                    </span>
                  </div>
                </div>
              </div>

              {/* Histogram Bins Panel */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm lg:col-span-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  Univariate Frequency Histogram (10 Bins)
                </h3>
                <div className="mt-6 space-y-3">
                  {distData.histogram_bins.map((bin) => {
                    const maxCount = Math.max(
                      ...distData.histogram_bins.map((b) => b.count),
                      1
                    );
                    const widthPct = (bin.count / maxCount) * 100;

                    return (
                      <div key={bin.bin_index} className="space-y-1">
                        <div className="flex justify-between items-center text-xs text-slate-400">
                          <span className="font-mono">{bin.label}</span>
                          <span className="font-mono font-semibold text-white">
                            {bin.count.toLocaleString()} rows
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-indigo-500 h-full rounded-full transition-all"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: OUTLIERS & ANOMALY INSPECTOR */}
      {activeTab === "outliers" && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Column:
                </span>
                <select
                  value={selectedColumn}
                  onChange={(e) => setSelectedColumn(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                >
                  {numericColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Method:
                </span>
                <div className="flex rounded-xl bg-slate-800 p-0.5 border border-slate-700">
                  <button
                    onClick={() => setOutlierMethod("IQR")}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                      outlierMethod === "IQR"
                        ? "bg-indigo-600 text-white shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Tukey IQR (1.5×IQR)
                  </button>
                  <button
                    onClick={() => setOutlierMethod("ZSCORE")}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                      outlierMethod === "ZSCORE"
                        ? "bg-indigo-600 text-white shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Z-Score (|z| &gt; 3.0)
                  </button>
                </div>
              </div>
            </div>

            {outlierData && (
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-400 border border-rose-500/20">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {outlierData.total_outliers} Outliers ({outlierData.outlier_percentage}%)
                </span>
              </div>
            )}
          </div>

          {isOutlierLoading ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              Scanning dataset rows for statistical outliers in DuckDB...
            </div>
          ) : !outlierData ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              Select a column to inspect its anomalous records.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Boundaries Banner */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Statistical Outlier Boundaries — {outlierData.method}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Normal boundary range is between{" "}
                    <span className="font-mono text-indigo-400 font-semibold">
                      {outlierData.lower_bound}
                    </span>{" "}
                    and{" "}
                    <span className="font-mono text-indigo-400 font-semibold">
                      {outlierData.upper_bound}
                    </span>
                    .
                  </p>
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  Showing top {outlierData.sample_outliers.length} sample anomalous records
                </div>
              </div>

              {/* Outliers Table */}
              {outlierData.sample_outliers.length === 0 ? (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-12 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400 mb-2" />
                  <p className="text-sm font-semibold text-emerald-300">
                    No outliers detected
                  </p>
                  <p className="text-xs text-emerald-400/80 mt-1">
                    All records in '{selectedColumn}' fall comfortably within normal statistical boundaries.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        <th className="py-3 px-4">Row ID</th>
                        <th className="py-3 px-4">{selectedColumn} Value</th>
                        <th className="py-3 px-4">Deviation Direction</th>
                        {Object.keys(outlierData.sample_outliers[0] || {})
                          .filter((k) => k !== selectedColumn && k !== "id")
                          .slice(0, 3)
                          .map((colKey) => (
                            <th key={colKey} className="py-3 px-4">
                              {colKey}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-sm">
                      {outlierData.sample_outliers.map((row, rIdx) => {
                        const val = Number(row[selectedColumn]);
                        const isHigh = val > outlierData.upper_bound;

                        return (
                          <tr key={rIdx} className="hover:bg-slate-800/40">
                            <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                              #{rIdx + 1}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-rose-400">
                              {row[selectedColumn]}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                                  isHigh
                                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                }`}
                              >
                                {isHigh
                                  ? "Upper Outlier (> Upper Bound)"
                                  : "Lower Outlier (< Lower Bound)"}
                              </span>
                            </td>
                            {Object.keys(outlierData.sample_outliers[0] || {})
                              .filter((k) => k !== selectedColumn && k !== "id")
                              .slice(0, 3)
                              .map((colKey) => (
                                <td
                                  key={colKey}
                                  className="py-3.5 px-4 font-mono text-xs text-slate-300"
                                >
                                  {String(row[colKey] ?? "null")}
                                </td>
                              ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
