"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  GitBranch,
  Sparkles,
  ArrowLeft,
  Activity,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Table as TableIcon,
  Network,
  ChevronRight,
  ChevronDown,
  Layers,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import { useDataset } from "@/hooks/use-datasets";
import {
  useXAIMetadata,
  useGenerateDriverTree,
  DriverNode,
  DriverTreeResponse,
} from "@/hooks/use-xai";

export default function ExplainableAIStudioPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params.workspaceSlug as string;
  const datasetId = params.datasetId as string;

  const { data: dataset } = useDataset(workspaceSlug, datasetId);
  const { data: metadata, isLoading: isMetaLoading } = useXAIMetadata(
    workspaceSlug,
    datasetId
  );
  const generateMutation = useGenerateDriverTree(workspaceSlug, datasetId);

  // Form controls
  const [targetCol, setTargetCol] = useState<string>("");
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [maxDepth, setMaxDepth] = useState<number>(2);
  const [treeData, setTreeData] = useState<DriverTreeResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"TREE" | "RANKINGS" | "TABLE">(
    "TREE"
  );

  // Initialize defaults once metadata loads
  useEffect(() => {
    if (metadata && !targetCol) {
      if (metadata.numeric_columns.length > 0) {
        setTargetCol(metadata.numeric_columns[0]);
      }
      if (metadata.categorical_columns.length > 0) {
        setSelectedDrivers(metadata.categorical_columns.slice(0, 3));
      }
    }
  }, [metadata, targetCol]);

  const handleGenerateTree = () => {
    if (!targetCol) return;
    generateMutation.mutate(
      {
        target_column: targetCol,
        driver_columns: selectedDrivers.length > 0 ? selectedDrivers : undefined,
        max_depth: maxDepth,
        top_k_branches: 4,
      },
      {
        onSuccess: (data) => {
          setTreeData(data);
          setActiveTab("TREE");
        },
      }
    );
  };

  const toggleDriverColumn = (col: string) => {
    if (selectedDrivers.includes(col)) {
      setSelectedDrivers(selectedDrivers.filter((c) => c !== col));
    } else {
      setSelectedDrivers([...selectedDrivers, col]);
    }
  };

  // Helper to render hierarchical tree node card
  const renderTreeNode = (node: DriverNode, depth: number = 0) => {
    return (
      <div
        key={node.id}
        style={{ marginLeft: `${depth * 24}px` }}
        className="mt-3"
      >
        <div className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  node.impact_direction === "POSITIVE"
                    ? "bg-emerald-500"
                    : "bg-red-500"
                }`}
              />
              <span className="font-bold text-white text-sm">
                {node.name}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-300 rounded">
                {node.sample_count} rows
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[10px]">Value</span>
                <span className="font-bold text-white">
                  {node.value.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">
                  Contribution
                </span>
                <span className="font-bold text-indigo-400">
                  {node.contribution_pct}%
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">
                  +10% What-If
                </span>
                <span className="font-bold text-purple-400">
                  +{node.sensitivity_score.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {node.children && node.children.length > 0 && (
          <div className="border-l-2 border-slate-800/80 ml-4 pl-2">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Helper to flatten nodes for Table View
  const flattenNodes = (node: DriverNode, list: DriverNode[] = []) => {
    list.push(node);
    if (node.children) {
      node.children.forEach((c) => flattenNodes(c, list));
    }
    return list;
  };

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      {/* Top Navigation & Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <button
            onClick={() =>
              router.push(`/dashboard/${workspaceSlug}/xai`)
            }
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium mb-3 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Explainable AI Hub
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Explainable AI Studio:{" "}
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
            Configure target KPIs and driver features to generate multi-level root cause driver trees
            and Shapley attribution rankings.
          </p>
        </div>
      </div>

      {/* Driver Tree Configuration Panel */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-4">
          <Sliders className="h-4 w-4" />
          Driver Tree Configuration
        </div>

        {isMetaLoading ? (
          <div className="flex items-center gap-2 text-xs text-slate-400 py-4">
            <Activity className="h-4 w-4 animate-spin text-indigo-500" />
            Inspecting dataset columns...
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              {/* Tree Depth Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Hierarchical Tree Depth ({maxDepth} Levels)
                </label>
                <input
                  type="range"
                  min="1"
                  max="4"
                  value={maxDepth}
                  onChange={(e) => setMaxDepth(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>1 Level</span>
                  <span>2 Levels</span>
                  <span>3 Levels</span>
                  <span>4 Levels</span>
                </div>
              </div>
            </div>

            {/* Candidate Driver Columns Checkboxes */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Candidate Driver Dimensions (Select features for causal branching)
              </label>
              <div className="flex flex-wrap gap-2">
                {metadata?.categorical_columns.map((col) => {
                  const isSelected = selectedDrivers.includes(col);
                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => toggleDriverColumn(col)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <span>{col}</span>
                      {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleGenerateTree}
                disabled={generateMutation.isPending || !targetCol}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-8 py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/20"
              >
                {generateMutation.isPending ? (
                  <>
                    <Activity className="h-4 w-4 animate-spin" />
                    Decomposing Driver Tree...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Driver Tree & Attribution
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Studio Area */}
      {generateMutation.isPending ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/40 border border-slate-800 rounded-2xl">
          <Activity className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
          <h3 className="text-base font-semibold text-white">
            Decomposing Root Cause Driver Tree...
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Computing ANOVA variance reduction and Shapley attribution scores.
          </p>
        </div>
      ) : generateMutation.isError ? (
        <div className="bg-red-950/20 border border-red-800/60 rounded-2xl p-6 text-red-300">
          <h3 className="font-bold text-sm mb-1">
            Driver Tree Generation Failed
          </h3>
          <p className="text-xs text-red-400">
            {generateMutation.error?.message ||
              "An error occurred while generating the causal driver tree."}
          </p>
        </div>
      ) : treeData ? (
        <div className="space-y-6">
          {/* AI Executive Root Cause Narrative Banner */}
          <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900/80 to-purple-950/40 border border-indigo-500/30 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      AI Executive Root Cause Narrative
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
                      Shapley Verified • {treeData.execution_time_ms} ms
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-white mt-1">
                    Target KPI: {treeData.target_column} ($
                    {treeData.total_kpi_value.toLocaleString()})
                  </h3>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 text-sm text-slate-200 leading-relaxed">
              {treeData.ai_narrative}
            </div>
          </div>

          {/* 3-Tab Studio Tabs */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("TREE")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === "TREE"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  <Network className="h-4 w-4" />
                  Interactive Driver Tree View
                </button>
                <button
                  onClick={() => setActiveTab("RANKINGS")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === "RANKINGS"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  Driver Attribution Rankings
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
                  Driver Breakdown Table
                </button>
              </div>
            </div>

            {/* TAB 1: TREE VIEW */}
            {activeTab === "TREE" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Root KPI & Branch Decomposition (Indented Hierarchy)
                  </span>
                  <span className="font-mono text-indigo-400">
                    Target: {treeData.target_column}
                  </span>
                </div>
                <div className="bg-slate-950 p-6 rounded-xl border border-slate-800/80">
                  {renderTreeNode(treeData.root_node, 0)}
                </div>
              </div>
            )}

            {/* TAB 2: ATTRIBUTION RANKINGS BAR CHART */}
            {activeTab === "RANKINGS" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Shapley-Style ANOVA Feature Importance Scores</span>
                  <span className="font-mono text-indigo-400">
                    Max Score: 100
                  </span>
                </div>
                <div className="space-y-3 bg-slate-950 p-6 rounded-xl border border-slate-800/80">
                  {treeData.driver_rankings.map((dr, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">
                            {dr.feature_name}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                              dr.direction === "POSITIVE"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : "bg-red-500/10 text-red-400 border border-red-500/30"
                            }`}
                          >
                            {dr.direction}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-slate-500 text-[10px]">
                            {dr.stat_metric}
                          </span>
                          <span className="font-bold text-indigo-400">
                            {dr.importance_score} / 100
                          </span>
                        </div>
                      </div>
                      <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${dr.importance_score}%` }}
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: BREAKDOWN TABLE */}
            {activeTab === "TABLE" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-xs uppercase">
                      <th className="p-3 font-semibold">Segment Name</th>
                      <th className="p-3 font-semibold">Dimension</th>
                      <th className="p-3 font-semibold">Sample Count</th>
                      <th className="p-3 font-semibold">Aggregate Value</th>
                      <th className="p-3 font-semibold">Contribution %</th>
                      <th className="p-3 font-semibold">Impact Direction</th>
                      <th className="p-3 font-semibold">+10% Sensitivity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {flattenNodes(treeData.root_node).map((node, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-800/30 transition-colors text-xs"
                      >
                        <td className="p-3 font-bold text-white">
                          {node.name}
                        </td>
                        <td className="p-3 font-mono text-slate-400">
                          {node.dimension}
                        </td>
                        <td className="p-3 font-mono text-slate-300">
                          {node.sample_count.toLocaleString()}
                        </td>
                        <td className="p-3 font-mono font-bold text-indigo-400">
                          {node.value.toLocaleString()}
                        </td>
                        <td className="p-3 font-mono text-slate-300">
                          {node.contribution_pct}%
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                              node.impact_direction === "POSITIVE"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : "bg-red-500/10 text-red-400 border border-red-500/30"
                            }`}
                          >
                            {node.impact_direction}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-purple-400 font-semibold">
                          +{node.sensitivity_score.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-20 bg-slate-900/40 border border-slate-800 rounded-2xl">
          <GitBranch className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">
            No Driver Tree Generated Yet
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Select a Target KPI above and click &quot;Generate Driver Tree &amp; Attribution&quot;.
          </p>
        </div>
      )}
    </div>
  );
}
