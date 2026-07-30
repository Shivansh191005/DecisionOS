"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Target,
  Sparkles,
  ArrowLeft,
  Activity,
  BarChart3,
  TrendingUp,
  Table as TableIcon,
  Sliders,
  PieChart,
  CheckCircle2,
  DollarSign,
  Percent,
} from "lucide-react";
import { useDataset } from "@/hooks/use-datasets";
import {
  useOptimizationMetadata,
  useSolveOptimization,
  OptimizationResponse,
} from "@/hooks/use-optimization";

export default function PrescriptiveOptimizationStudioPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params.workspaceSlug as string;
  const datasetId = params.datasetId as string;

  const { data: dataset } = useDataset(workspaceSlug, datasetId);
  const { data: metadata, isLoading: isMetaLoading } = useOptimizationMetadata(
    workspaceSlug,
    datasetId
  );
  const solveMutation = useSolveOptimization(workspaceSlug, datasetId);

  // Form controls
  const [mode, setMode] = useState<"GOAL_SEEK" | "RESOURCE_ALLOCATION">(
    "GOAL_SEEK"
  );
  const [targetCol, setTargetCol] = useState<string>("");
  const [constraintCol, setConstraintCol] = useState<string>("");
  const [segmentCol, setSegmentCol] = useState<string>("");
  const [targetGoalVal, setTargetGoalVal] = useState<string>("150000");
  const [totalBudgetVal, setTotalBudgetVal] = useState<string>("50000");
  const [maxAdjustmentPct, setMaxAdjustmentPct] = useState<number>(50);
  const [optData, setOptData] = useState<OptimizationResponse | null>(null);
  const [activeTab, setActiveTab] = useState<
    "CHART" | "TABLE" | "SENSITIVITY"
  >("CHART");

  // Initialize defaults once metadata loads
  useEffect(() => {
    if (metadata && !targetCol) {
      if (metadata.numeric_columns.length > 0) {
        setTargetCol(metadata.numeric_columns[0]);
        if (metadata.numeric_columns.length > 1) {
          setConstraintCol(metadata.numeric_columns[1]);
        } else {
          setConstraintCol(metadata.numeric_columns[0]);
        }
      }
      if (metadata.categorical_columns.length > 0) {
        setSegmentCol(metadata.categorical_columns[0]);
      }
    }
  }, [metadata, targetCol]);

  const handleSolve = () => {
    if (!targetCol) return;
    solveMutation.mutate(
      {
        mode,
        target_column: targetCol,
        constraint_column: constraintCol || undefined,
        segment_column: segmentCol || undefined,
        target_goal_value:
          mode === "GOAL_SEEK" ? Number(targetGoalVal) || 150000 : undefined,
        total_budget_constraint:
          mode === "RESOURCE_ALLOCATION"
            ? Number(totalBudgetVal) || 50000
            : undefined,
        max_adjustment_pct: maxAdjustmentPct,
      },
      {
        onSuccess: (data) => {
          setOptData(data);
          setActiveTab("CHART");
        },
      }
    );
  };

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      {/* Top Navigation & Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <button
            onClick={() =>
              router.push(`/dashboard/${workspaceSlug}/optimization`)
            }
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium mb-3 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Prescriptive Optimization Hub
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Prescriptive Optimization Studio:{" "}
              <span className="text-indigo-400">
                {dataset?.name || "Loading..."}
              </span>
            </h1>
            {dataset && (
              <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
                {dataset.status}
              </span>
            )}
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Configure target KPI goals, resource caps, and max adjustment bounds to generate AI
            prescriptive action plans.
          </p>
        </div>
      </div>

      {/* Solver Configuration Panel */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            <Sliders className="h-4 w-4" />
            Prescriptive Solver Configuration
          </div>

          {/* Mode Switcher Buttons */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setMode("GOAL_SEEK")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === "GOAL_SEEK"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Goal-Seeking Solver
            </button>
            <button
              type="button"
              onClick={() => setMode("RESOURCE_ALLOCATION")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === "RESOURCE_ALLOCATION"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <PieChart className="h-3.5 w-3.5" />
              Resource Allocation
            </button>
          </div>
        </div>

        {isMetaLoading ? (
          <div className="flex items-center gap-2 text-xs text-slate-400 py-4">
            <Activity className="h-4 w-4 animate-spin text-indigo-500" />
            Inspecting dataset schema...
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Target KPI Column */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Target KPI Metric (Numeric)
                </label>
                <select
                  value={targetCol}
                  onChange={(e) => setTargetCol(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm focus:outline-none"
                >
                  {metadata?.numeric_columns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

              {/* Resource Constraint Column */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Resource or Driver Column to Adjust
                </label>
                <select
                  value={constraintCol}
                  onChange={(e) => setConstraintCol(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm focus:outline-none"
                >
                  {metadata?.numeric_columns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

              {/* Categorical Segment Column */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Allocation Segment Dimension
                </label>
                <select
                  value={segmentCol}
                  onChange={(e) => setSegmentCol(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm focus:outline-none"
                >
                  {metadata?.categorical_columns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-800/80">
              {/* Conditional Input based on Mode */}
              {mode === "GOAL_SEEK" ? (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">
                    Target KPI Goal Value ($)
                  </label>
                  <input
                    type="number"
                    value={targetGoalVal}
                    onChange={(e) => setTargetGoalVal(e.target.value)}
                    placeholder="150000"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">
                    The solver calculates required segment adjustments to achieve this KPI target.
                  </span>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">
                    Total Resource Budget Cap ($)
                  </label>
                  <input
                    type="number"
                    value={totalBudgetVal}
                    onChange={(e) => setTotalBudgetVal(e.target.value)}
                    placeholder="50000"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">
                    The solver maximizes total Target KPI return under this budget constraint.
                  </span>
                </div>
              )}

              {/* Max Adjustment Percentage Slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-300">
                    Max Allowable Segment Adjustment (±{maxAdjustmentPct}%)
                  </label>
                  <span className="text-xs font-mono font-bold text-indigo-400">
                    ±{maxAdjustmentPct}%
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={maxAdjustmentPct}
                  onChange={(e) => setMaxAdjustmentPct(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>±10% Conservative</span>
                  <span>±50% Balanced</span>
                  <span>±100% Aggressive</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSolve}
                disabled={solveMutation.isPending || !targetCol}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-8 py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/20"
              >
                {solveMutation.isPending ? (
                  <>
                    <Activity className="h-4 w-4 animate-spin" />
                    Executing Prescriptive Solver...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Execute Prescriptive Solver
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Studio Area */}
      {solveMutation.isPending ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/40 border border-slate-800 rounded-2xl">
          <Activity className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
          <h3 className="text-base font-semibold text-white">
            Optimizing Resource Allocations...
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Evaluating marginal efficiency ratios and enforcing percentage bounds.
          </p>
        </div>
      ) : solveMutation.isError ? (
        <div className="bg-red-950/20 border border-red-800/60 rounded-2xl p-6 text-red-300">
          <h3 className="font-bold text-sm mb-1">
            Prescriptive Solver Failed
          </h3>
          <p className="text-xs text-red-400">
            {solveMutation.error?.message ||
              "An error occurred while executing the optimization solver."}
          </p>
        </div>
      ) : optData ? (
        <div className="space-y-6">
          {/* AI Prescriptive Action Banner */}
          <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900/80 to-purple-950/40 border border-indigo-500/30 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      AI Prescriptive Action Plan
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
                      Simplex Verified • {optData.execution_time_ms} ms
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-white mt-1">
                    Optimization Mode: {optData.mode}
                  </h3>
                </div>
              </div>

              {/* Scorecard Badges */}
              <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">
                    Baseline KPI
                  </span>
                  <span className="font-bold text-slate-300 font-mono">
                    ${optData.baseline_kpi_value.toLocaleString()}
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-800" />
                <div>
                  <span className="text-slate-500 block text-[10px]">
                    Optimized KPI
                  </span>
                  <span className="font-bold text-emerald-400 font-mono">
                    ${optData.optimized_kpi_value.toLocaleString()}
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-800" />
                <div>
                  <span className="text-slate-500 block text-[10px]">
                    Total Uplift
                  </span>
                  <span className="font-bold text-indigo-400 font-mono">
                    {optData.total_uplift_pct >= 0 ? "+" : ""}
                    {optData.total_uplift_pct}%
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 text-sm text-slate-200 leading-relaxed">
              {optData.ai_prescriptive_narrative}
            </div>
          </div>

          {/* 3-Tab Studio Tabs */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("CHART")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === "CHART"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  Before/After Reallocation Chart
                </button>
                <button
                  onClick={() => setActiveTab("TABLE")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === "TABLE"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  <TableIcon className="h-4 w-4" />
                  Prescriptive Action Table
                </button>
                <button
                  onClick={() => setActiveTab("SENSITIVITY")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === "SENSITIVITY"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  <Sliders className="h-4 w-4" />
                  Sensitivity &amp; Bounds Matrix
                </button>
              </div>
            </div>

            {/* TAB 1: BEFORE/AFTER REALLOCATION CHART */}
            {activeTab === "CHART" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Current vs Recommended Allocation by Segment
                  </span>
                  <span className="font-mono text-indigo-400">
                    Max Bounds: ±{maxAdjustmentPct}%
                  </span>
                </div>

                <div className="space-y-4 bg-slate-950 p-6 rounded-xl border border-slate-800/80">
                  {optData.allocations.map((item, idx) => {
                    const maxVal = Math.max(
                      ...optData.allocations.map((a) =>
                        Math.max(a.current_value, a.recommended_value)
                      )
                    );
                    const curPct = (item.current_value / (maxVal || 1)) * 100;
                    const recPct =
                      (item.recommended_value / (maxVal || 1)) * 100;

                    return (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white">
                            {item.segment_or_driver}
                          </span>
                          <div className="flex items-center gap-4 font-mono">
                            <span className="text-slate-500 text-[11px]">
                              ROI: {item.efficiency_roi}x
                            </span>
                            <span
                              className={`font-bold ${
                                item.adjustment_delta >= 0
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              }`}
                            >
                              {item.adjustment_delta >= 0 ? "+" : ""}
                              {item.adjustment_delta.toLocaleString()} (
                              {item.adjustment_pct >= 0 ? "+" : ""}
                              {item.adjustment_pct}%)
                            </span>
                          </div>
                        </div>

                        {/* Baseline Bar */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 w-20">
                              Current: ${item.current_value.toLocaleString()}
                            </span>
                            <div className="h-2.5 flex-1 bg-slate-900 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${curPct}%` }}
                                className="h-full bg-slate-600 rounded-full"
                              />
                            </div>
                          </div>

                          {/* Recommended Bar */}
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-indigo-400 font-bold w-20">
                              Recommended: ${item.recommended_value.toLocaleString()}
                            </span>
                            <div className="h-3 flex-1 bg-slate-900 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${recPct}%` }}
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: PRESCRIPTIVE ACTION TABLE */}
            {activeTab === "TABLE" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-xs uppercase">
                      <th className="p-3 font-semibold">Segment / Driver</th>
                      <th className="p-3 font-semibold">Current Value</th>
                      <th className="p-3 font-semibold">Recommended Value</th>
                      <th className="p-3 font-semibold">Adjustment Delta</th>
                      <th className="p-3 font-semibold">Adjustment %</th>
                      <th className="p-3 font-semibold">Expected KPI Return</th>
                      <th className="p-3 font-semibold">Efficiency Multiple</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {optData.allocations.map((item, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-800/30 transition-colors text-xs"
                      >
                        <td className="p-3 font-bold text-white">
                          {item.segment_or_driver}
                        </td>
                        <td className="p-3 font-mono text-slate-400">
                          ${item.current_value.toLocaleString()}
                        </td>
                        <td className="p-3 font-mono font-bold text-indigo-400">
                          ${item.recommended_value.toLocaleString()}
                        </td>
                        <td className="p-3 font-mono font-semibold">
                          <span
                            className={
                              item.adjustment_delta >= 0
                                ? "text-emerald-400"
                                : "text-red-400"
                            }
                          >
                            {item.adjustment_delta >= 0 ? "+" : ""}
                            ${item.adjustment_delta.toLocaleString()}
                          </span>
                        </td>
                        <td className="p-3 font-mono">
                          <span
                            className={
                              item.adjustment_pct >= 0
                                ? "text-emerald-400"
                                : "text-red-400"
                            }
                          >
                            {item.adjustment_pct >= 0 ? "+" : ""}
                            {item.adjustment_pct}%
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-purple-400">
                          ${item.expected_kpi_impact.toLocaleString()}
                        </td>
                        <td className="p-3 font-mono text-slate-300">
                          {item.efficiency_roi}x
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 3: SENSITIVITY & BOUNDS MATRIX */}
            {activeTab === "SENSITIVITY" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    What-If Constraint Sensitivity (Comparing Alternative Adjustment Bounds)
                  </span>
                  <span className="font-mono text-indigo-400">
                    Mode: {optData.mode}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-950 p-5 rounded-xl border border-slate-800/80">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                      Conservative Bound (±15%)
                    </span>
                    <div className="text-xl font-bold text-white font-mono">
                      $
                      {(
                        optData.baseline_kpi_value +
                        (optData.optimized_kpi_value - optData.baseline_kpi_value) *
                          0.4
                      ).toLocaleString()}
                    </div>
                    <span className="text-[11px] text-emerald-400 mt-1 block font-mono">
                      Projected Uplift: +
                      {(optData.total_uplift_pct * 0.4).toFixed(1)}%
                    </span>
                  </div>

                  <div className="bg-indigo-950/40 p-5 rounded-xl border border-indigo-500/40">
                    <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider block mb-2">
                      Active Configured Bound (±{maxAdjustmentPct}%)
                    </span>
                    <div className="text-xl font-bold text-emerald-400 font-mono">
                      ${optData.optimized_kpi_value.toLocaleString()}
                    </div>
                    <span className="text-[11px] text-indigo-300 mt-1 block font-mono">
                      Projected Uplift: +{optData.total_uplift_pct}%
                    </span>
                  </div>

                  <div className="bg-slate-950 p-5 rounded-xl border border-slate-800/80">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                      Aggressive Bound (±100%)
                    </span>
                    <div className="text-xl font-bold text-purple-400 font-mono">
                      $
                      {(
                        optData.baseline_kpi_value +
                        (optData.optimized_kpi_value - optData.baseline_kpi_value) *
                          1.6
                      ).toLocaleString()}
                    </div>
                    <span className="text-[11px] text-purple-300 mt-1 block font-mono">
                      Projected Uplift: +
                      {(optData.total_uplift_pct * 1.6).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-20 bg-slate-900/40 border border-slate-800 rounded-2xl">
          <Target className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">
            No Prescriptive Action Plan Generated Yet
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Configure optimization mode and target goals above, then click &quot;Execute Prescriptive Solver&quot;.
          </p>
        </div>
      )}
    </div>
  );
}
