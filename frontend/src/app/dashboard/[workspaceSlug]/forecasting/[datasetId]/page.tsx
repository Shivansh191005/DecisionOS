"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  TrendingUp,
  Sliders,
  Activity,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Calendar,
  Layers,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle2,
  DollarSign,
  Percent,
} from "lucide-react";
import {
  useForecastingMetadata,
  useGenerateForecast,
  useRunWhatIfScenario,
  ForecastResponse,
  WhatIfScenarioResponse,
  WhatIfAdjustment,
} from "@/hooks/use-forecasting";

export default function ForecastingStudioPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params.workspaceSlug as string;
  const datasetId = params.datasetId as string;

  // Active UI Tab
  const [activeTab, setActiveTab] = useState<"forecast" | "whatif" | "diagnostics">("forecast");

  // Control Form Parameters
  const [dateCol, setDateCol] = useState<string>("");
  const [targetCol, setTargetCol] = useState<string>("");
  const [aggFn, setAggFn] = useState<"SUM" | "AVG" | "COUNT" | "MAX" | "MIN">("SUM");
  const [frequency, setFrequency] = useState<"D" | "W" | "M" | "Q" | "Y">("M");
  const [horizon, setHorizon] = useState<number>(12);
  const [modelType, setModelType] = useState<"AUTO" | "ETS" | "ARIMA" | "LINEAR_TREND">("AUTO");

  // What-If Scenario State
  const [trendMultiplier, setTrendMultiplier] = useState<number>(1.0);
  const [stepChangePct, setStepChangePct] = useState<number>(0.0);
  const [adjustments, setAdjustments] = useState<WhatIfAdjustment[]>([]);

  // Queries & Mutations
  const {
    data: metadata,
    isLoading: isMetaLoading,
    isError: isMetaError,
  } = useForecastingMetadata(workspaceSlug, datasetId);

  const generateForecastMutation = useGenerateForecast(workspaceSlug, datasetId);
  const runWhatIfMutation = useRunWhatIfScenario(workspaceSlug, datasetId);

  // Default selection when metadata loads
  useEffect(() => {
    if (metadata) {
      if (!dateCol && metadata.date_columns.length > 0) {
        setDateCol(metadata.date_columns[0]);
      }
      if (!targetCol && metadata.numeric_columns.length > 0) {
        setTargetCol(metadata.numeric_columns[0]);
      }
    }
  }, [metadata, dateCol, targetCol]);

  // Handle generating forecast
  const handleGenerateForecast = () => {
    if (!dateCol || !targetCol) return;
    generateForecastMutation.mutate({
      date_column: dateCol,
      target_column: targetCol,
      agg_fn: aggFn,
      horizon: horizon,
      frequency: frequency,
      model_type: modelType,
    });
  };

  // Handle running what-if simulation
  const handleRunWhatIf = () => {
    if (!generateForecastMutation.data) return;
    runWhatIfMutation.mutate({
      target_column: targetCol,
      base_forecast_data_points: generateForecastMutation.data.data_points,
      trend_multiplier: trendMultiplier,
      step_change_pct: stepChangePct,
      adjustments: adjustments,
    });
  };

  // Auto-run forecast once columns are selected
  useEffect(() => {
    if (dateCol && targetCol && !generateForecastMutation.data && !generateForecastMutation.isPending) {
      handleGenerateForecast();
    }
  }, [dateCol, targetCol]);

  // Add a What-If driver elasticity row
  const addAdjustmentRow = () => {
    if (!metadata?.numeric_columns.length) return;
    setAdjustments([
      ...adjustments,
      {
        driver_column: metadata.numeric_columns[0],
        percentage_change: 10.0,
        elasticity: 0.5,
      },
    ]);
  };

  const removeAdjustmentRow = (idx: number) => {
    setAdjustments(adjustments.filter((_, i) => i !== idx));
  };

  const updateAdjustmentRow = (idx: number, key: keyof WhatIfAdjustment, val: any) => {
    const updated = [...adjustments];
    updated[idx] = { ...updated[idx], [key]: val };
    setAdjustments(updated);
  };

  const forecastData = generateForecastMutation.data;
  const whatIfData = runWhatIfMutation.data;

  return (
    <div className="space-y-6 p-8">
      {/* Top Header & Back Button */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/dashboard/${workspaceSlug}/forecasting`)}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
              <TrendingUp className="h-3.5 w-3.5" />
              Decision Intelligence • Time-Series Studio
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">
              {forecastData?.dataset_name || "Dataset Time-Series Studio"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateForecast}
            disabled={generateForecastMutation.isPending || !dateCol || !targetCol}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-medium text-xs px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${generateForecastMutation.isPending ? "animate-spin" : ""}`}
            />
            {generateForecastMutation.isPending ? "Forecasting..." : "Regenerate Forecast"}
          </button>
        </div>
      </div>

      {/* Control Form Ribbon */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Date / Index Column
          </label>
          <select
            value={dateCol}
            onChange={(e) => setDateCol(e.target.value)}
            disabled={isMetaLoading || isMetaError}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            {metadata?.date_columns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Target KPI Column
          </label>
          <select
            value={targetCol}
            onChange={(e) => setTargetCol(e.target.value)}
            disabled={isMetaLoading || isMetaError}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            {metadata?.numeric_columns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Aggregation
          </label>
          <select
            value={aggFn}
            onChange={(e) => setAggFn(e.target.value as any)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="SUM">SUM (Total)</option>
            <option value="AVG">AVG (Mean)</option>
            <option value="COUNT">COUNT (Volume)</option>
            <option value="MAX">MAX (Peak)</option>
            <option value="MIN">MIN (Trough)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Frequency
          </label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as any)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="D">Daily (D)</option>
            <option value="W">Weekly (W)</option>
            <option value="M">Monthly (M)</option>
            <option value="Q">Quarterly (Q)</option>
            <option value="Y">Yearly (Y)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Forecast Horizon ({horizon} periods)
          </label>
          <input
            type="range"
            min={3}
            max={36}
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Model Algorithm
          </label>
          <select
            value={modelType}
            onChange={(e) => setModelType(e.target.value as any)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="AUTO">AUTO (Best Fit MAPE)</option>
            <option value="ETS">Holt-Winters ETS</option>
            <option value="ARIMA">ARIMA Trend</option>
            <option value="LINEAR_TREND">OLS Linear Trend</option>
          </select>
        </div>
      </div>

      {/* Tab Navigation Ribbon */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab("forecast")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "forecast"
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/10"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          1. Time-Series Forecast & AI Brief
        </button>
        <button
          onClick={() => {
            setActiveTab("whatif");
            if (!whatIfData && forecastData) {
              handleRunWhatIf();
            }
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "whatif"
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/10"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Sliders className="h-4 w-4" />
          2. What-If Scenario Simulator
        </button>
        <button
          onClick={() => setActiveTab("diagnostics")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "diagnostics"
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/10"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Activity className="h-4 w-4" />
          3. Model Diagnostics & Error Scorecard
        </button>
      </div>

      {/* Tab 1: Time-Series Forecast & AI Brief */}
      {activeTab === "forecast" && (
        <div className="space-y-6">
          {generateForecastMutation.isPending && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
              <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin mx-auto mb-3" />
              Fitting statistical time-series models and calculating 80%/95% prediction intervals...
            </div>
          )}

          {generateForecastMutation.isError && (
            <div className="bg-red-950/30 border border-red-500/40 rounded-xl p-6 text-red-300 flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-400 shrink-0" />
              <div>
                <h4 className="font-bold text-sm">Forecasting Engine Error</h4>
                <p className="text-xs text-red-400/80 mt-0.5">
                  {(generateForecastMutation.error as any)?.response?.data?.detail?.message ||
                    generateForecastMutation.error.message}
                </p>
              </div>
            </div>
          )}

          {forecastData && (
            <>
              {/* AI Natural Language Briefing Card */}
              <div className="bg-gradient-to-r from-indigo-950/40 via-slate-900/80 to-slate-900/80 border border-indigo-500/30 rounded-xl p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                        AI Executive Forecasting Narrative
                      </span>
                      <h3 className="text-lg font-bold text-white mt-0.5">
                        {forecastData.ai_brief.title}
                      </h3>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {forecastData.ai_brief.metric_badge}
                  </span>
                </div>
                <p className="text-slate-300 text-sm mt-3 leading-relaxed">
                  {forecastData.ai_brief.description}
                </p>
              </div>

              {/* KPI Model Scorecard Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs text-slate-400 font-medium">Model Algorithm</span>
                  <div className="text-xl font-bold text-white mt-1">
                    {forecastData.model_type_used}
                  </div>
                  <div className="text-xs text-indigo-400 mt-1 font-mono">
                    Best Fit Selected
                  </div>
                </div>

                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs text-slate-400 font-medium">MAPE Error</span>
                  <div className="text-xl font-bold text-emerald-400 mt-1">
                    {forecastData.metrics.mape}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Mean Abs. Percentage Error</div>
                </div>

                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs text-slate-400 font-medium">RMSE</span>
                  <div className="text-xl font-bold text-white mt-1">
                    {forecastData.metrics.rmse.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Root Mean Squared Error</div>
                </div>

                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs text-slate-400 font-medium">MAE</span>
                  <div className="text-xl font-bold text-white mt-1">
                    {forecastData.metrics.mae.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Mean Absolute Error</div>
                </div>
              </div>

              {/* Forecast Data Table with Confidence Intervals */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-indigo-400" />
                    Time-Series Trajectory & 80%/95% Confidence Bounds
                  </h3>
                  <span className="text-xs text-slate-400">
                    Showing {forecastData.data_points.length} periods ({horizon} forecast horizons)
                  </span>
                </div>

                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                        <th className="py-3 px-4 font-semibold">Period Date</th>
                        <th className="py-3 px-4 font-semibold">Status</th>
                        <th className="py-3 px-4 font-semibold text-right">Actual Value</th>
                        <th className="py-3 px-4 font-semibold text-right">Forecast Baseline</th>
                        <th className="py-3 px-4 font-semibold text-right">80% Interval</th>
                        <th className="py-3 px-4 font-semibold text-right">95% Interval</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {forecastData.data_points.map((pt, idx) => (
                        <tr
                          key={idx}
                          className={pt.is_forecast ? "bg-indigo-950/20 text-indigo-100" : "hover:bg-slate-800/40"}
                        >
                          <td className="py-2.5 px-4 font-mono font-medium">{pt.date}</td>
                          <td className="py-2.5 px-4">
                            {pt.is_forecast ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-500/20 text-indigo-300 font-semibold">
                                <TrendingUp className="h-3 w-3" />
                                Forecast
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300">
                                Actual
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono">
                            {pt.actual_value !== null ? pt.actual_value.toLocaleString() : "—"}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-300">
                            {pt.forecast_value !== null ? pt.forecast_value.toLocaleString() : "—"}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-400">
                            {pt.lower_80 !== null && pt.upper_80 !== null
                              ? `[${pt.lower_80.toLocaleString()} .. ${pt.upper_80.toLocaleString()}]`
                              : "—"}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-400">
                            {pt.lower_95 !== null && pt.upper_95 !== null
                              ? `[${pt.lower_95.toLocaleString()} .. ${pt.upper_95.toLocaleString()}]`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 2: Interactive What-If Simulator */}
      {activeTab === "whatif" && (
        <div className="space-y-6">
          {!forecastData ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
              Please generate a time-series forecast on Tab 1 before simulating What-If scenarios.
            </div>
          ) : (
            <>
              {/* Simulation Sliders Card */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Sliders className="h-5 w-5 text-indigo-400" />
                      Interactive What-If Intervention Parameters
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Adjust trend acceleration, step uplifts, and feature elasticities to model alternative outcomes.
                    </p>
                  </div>

                  <button
                    onClick={handleRunWhatIf}
                    disabled={runWhatIfMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${runWhatIfMutation.isPending ? "animate-spin" : ""}`}
                    />
                    Run What-If Simulation
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-300">
                        Trend Growth Multiplier ({trendMultiplier}x)
                      </label>
                      <span className="text-xs font-mono text-indigo-400">
                        {((trendMultiplier - 1.0) * 100).toFixed(0)}% acceleration
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={2.0}
                      step={0.05}
                      value={trendMultiplier}
                      onChange={(e) => setTrendMultiplier(Number(e.target.value))}
                      className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-300">
                        Immediate Step Change ({stepChangePct > 0 ? `+${stepChangePct}` : stepChangePct}%)
                      </label>
                      <span className="text-xs font-mono text-emerald-400">
                        Permanent {stepChangePct}% shift
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-30}
                      max={50}
                      step={1}
                      value={stepChangePct}
                      onChange={(e) => setStepChangePct(Number(e.target.value))}
                      className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                </div>

                {/* Driver Feature Elasticities */}
                <div className="pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-300">
                      Driver Feature Elasticities
                    </span>
                    <button
                      onClick={addAdjustmentRow}
                      className="text-xs text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 font-semibold"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Driver Adjustment
                    </button>
                  </div>

                  {adjustments.length === 0 ? (
                    <div className="text-xs text-slate-500 italic py-2">
                      No driver elasticities added. Click &quot;Add Driver Adjustment&quot; to model spend or price sensitivity.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {adjustments.map((adj, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col md:flex-row items-center gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800"
                        >
                          <div className="w-full md:w-1/3">
                            <label className="block text-slate-400 text-xs mb-1">Driver Feature</label>
                            <select
                              value={adj.driver_column}
                              onChange={(e) => updateAdjustmentRow(idx, "driver_column", e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                            >
                              {metadata?.numeric_columns.map((col) => (
                                <option key={col} value={col}>
                                  {col}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="w-full md:w-1/3">
                            <label className="block text-slate-400 text-xs mb-1">
                              Percentage Change ({adj.percentage_change}%)
                            </label>
                            <input
                              type="number"
                              value={adj.percentage_change}
                              onChange={(e) =>
                                updateAdjustmentRow(idx, "percentage_change", Number(e.target.value))
                              }
                              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                            />
                          </div>

                          <div className="w-full md:w-1/3">
                            <label className="block text-slate-400 text-xs mb-1">
                              Elasticity Coefficient ({adj.elasticity})
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={adj.elasticity}
                              onChange={(e) =>
                                updateAdjustmentRow(idx, "elasticity", Number(e.target.value))
                              }
                              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                            />
                          </div>

                          <button
                            onClick={() => removeAdjustmentRow(idx)}
                            className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* What-If Simulation Results */}
              {whatIfData && (
                <>
                  {/* AI Recommendation Card */}
                  <div className="bg-gradient-to-r from-purple-950/40 via-slate-900/80 to-slate-900/80 border border-purple-500/30 rounded-xl p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-purple-500/20 text-purple-400">
                          <Sliders className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                            AI Decision Intelligence Recommendation
                          </span>
                          <h3 className="text-lg font-bold text-white mt-0.5">
                            {whatIfData.ai_recommendation.title}
                          </h3>
                        </div>
                      </div>

                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {whatIfData.ai_recommendation.metric_badge}
                      </span>
                    </div>
                    <p className="text-slate-300 text-sm mt-3 leading-relaxed">
                      {whatIfData.ai_recommendation.description}
                    </p>
                  </div>

                  {/* Cumulative Financial Impact Banner */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
                      <span className="text-xs text-slate-400 font-medium">Baseline Total</span>
                      <div className="text-xl font-bold text-slate-300 mt-1 font-mono">
                        {whatIfData.baseline_total.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">Status Quo Forecast</div>
                    </div>

                    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
                      <span className="text-xs text-slate-400 font-medium">Simulated Total</span>
                      <div className="text-xl font-bold text-white mt-1 font-mono">
                        {whatIfData.simulated_total.toLocaleString()}
                      </div>
                      <div className="text-xs text-indigo-400 mt-1">With What-If Adjustments</div>
                    </div>

                    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
                      <span className="text-xs text-slate-400 font-medium">Net Delta Impact</span>
                      <div
                        className={`text-xl font-bold mt-1 font-mono ${
                          whatIfData.net_delta >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {whatIfData.net_delta >= 0 ? `+${whatIfData.net_delta.toLocaleString()}` : whatIfData.net_delta.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">Cumulative Value Uplift</div>
                    </div>

                    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
                      <span className="text-xs text-slate-400 font-medium">Percentage Shift</span>
                      <div
                        className={`text-xl font-bold mt-1 font-mono ${
                          whatIfData.net_percentage >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {whatIfData.net_percentage >= 0 ? `+${whatIfData.net_percentage}%` : `${whatIfData.net_percentage}%`}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">Net % Impact</div>
                    </div>
                  </div>

                  {/* Comparison Series Table */}
                  <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                      <h3 className="font-bold text-white text-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-purple-400" />
                        Baseline vs. Simulated Period Comparison Table
                      </h3>
                      <span className="text-xs text-slate-400">
                        Showing {whatIfData.comparison_series.length} total periods
                      </span>
                    </div>

                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                            <th className="py-3 px-4 font-semibold">Period Date</th>
                            <th className="py-3 px-4 font-semibold">Status</th>
                            <th className="py-3 px-4 font-semibold text-right">Baseline Forecast</th>
                            <th className="py-3 px-4 font-semibold text-right">Simulated Forecast</th>
                            <th className="py-3 px-4 font-semibold text-right">Delta Value</th>
                            <th className="py-3 px-4 font-semibold text-right">Delta %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {whatIfData.comparison_series.map((pt, idx) => (
                            <tr
                              key={idx}
                              className={
                                pt.is_forecast
                                  ? "bg-purple-950/20 text-purple-100"
                                  : "hover:bg-slate-800/40"
                              }
                            >
                              <td className="py-2.5 px-4 font-mono font-medium">{pt.date}</td>
                              <td className="py-2.5 px-4">
                                {pt.is_forecast ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-300 font-semibold">
                                    Simulated
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300">
                                    Actual
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono">
                                {pt.baseline_value.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-purple-300">
                                {pt.simulated_value.toLocaleString()}
                              </td>
                              <td
                                className={`py-2.5 px-4 text-right font-mono font-semibold ${
                                  pt.delta_value >= 0 ? "text-emerald-400" : "text-red-400"
                                }`}
                              >
                                {pt.delta_value >= 0 ? `+${pt.delta_value.toLocaleString()}` : pt.delta_value.toLocaleString()}
                              </td>
                              <td
                                className={`py-2.5 px-4 text-right font-mono ${
                                  pt.delta_percentage >= 0 ? "text-emerald-400" : "text-red-400"
                                }`}
                              >
                                {pt.delta_percentage >= 0 ? `+${pt.delta_percentage}%` : `${pt.delta_percentage}%`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Tab 3: Model Diagnostics & Error Scorecard */}
      {activeTab === "diagnostics" && (
        <div className="space-y-6">
          {!forecastData ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
              Please generate a time-series forecast on Tab 1 to inspect error diagnostics.
            </div>
          ) : (
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity className="h-5 w-5 text-indigo-400" />
                    Technical Diagnostics & Model Selection Rationale
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Evaluated Holt-Winters Exponential Smoothing, ARIMA trend-drift, and OLS Linear Regression.
                  </p>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Model Selected: {forecastData.model_type_used}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    MAPE (Mean Abs. % Error)
                  </span>
                  <div className="text-2xl font-bold text-emerald-400 mt-2">
                    {forecastData.metrics.mape}%
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Measures average percentage deviation across historical training periods. Lower is better.
                  </p>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    RMSE (Root Mean Sq. Error)
                  </span>
                  <div className="text-2xl font-bold text-white mt-2">
                    {forecastData.metrics.rmse.toLocaleString()}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Penalizes large outlier residuals in historical fit. Used to scale 80%/95% confidence intervals.
                  </p>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Seasonality Detection
                  </span>
                  <div className="text-2xl font-bold text-indigo-400 mt-2">
                    {forecastData.metrics.seasonality_detected ? "Detected (Active)" : "None"}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Frequency sampling ({frequency}) checked for periodic additive/multiplicative seasonality.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
