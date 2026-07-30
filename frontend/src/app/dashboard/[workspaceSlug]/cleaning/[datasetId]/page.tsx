"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wand2,
  Sparkles,
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Play,
  Database,
  Layers,
  Filter,
  Calculator,
  HelpCircle,
  Code2,
} from "lucide-react";
import { useDataset } from "@/hooks/use-datasets";
import {
  CleaningStep,
  useCleaningRecommendations,
  useCleaningPreview,
  useSaveCleaningRecipe,
  useCommitCleaningRecipe,
} from "@/hooks/use-cleaning";

interface CleaningStudioProps {
  params: Promise<{
    workspaceSlug: string;
    datasetId: string;
  }>;
}

export default function CleaningStudioPage({ params }: CleaningStudioProps) {
  const resolvedParams = use(params);
  const { workspaceSlug, datasetId } = resolvedParams;
  const router = useRouter();

  const { data: dataset, isLoading: isDatasetLoading } = useDataset(
    workspaceSlug,
    datasetId
  );
  const { data: recommendations } = useCleaningRecommendations(
    workspaceSlug,
    datasetId
  );

  const [recipeName, setRecipeName] = useState("Default Cleaning Recipe");
  const [steps, setSteps] = useState<CleaningStep[]>([]);
  const [activeTab, setActiveTab] = useState<"advisor" | "builder">("advisor");
  const [newDatasetName, setNewDatasetName] = useState("");
  const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);

  // Manual Builder State
  const [stepType, setStepType] = useState<CleaningStep["type"]>("IMPUTE_NULL");
  const [selectedCol, setSelectedCol] = useState("");
  const [imputeStrategy, setImputeStrategy] = useState<"MEAN" | "MEDIAN" | "MODE" | "CONSTANT">("MEAN");
  const [imputeValue, setImputeValue] = useState("0");
  const [filterCond, setFilterCond] = useState("revenue > 0");
  const [newColName, setNewColName] = useState("profit");
  const [derivedFormula, setDerivedFormula] = useState("revenue - cost");
  const [targetType, setTargetType] = useState("DOUBLE");

  // Pagination
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);

  const previewMutation = useCleaningPreview(workspaceSlug, datasetId);
  const saveMutation = useSaveCleaningRecipe(workspaceSlug, datasetId);
  const commitMutation = useCommitCleaningRecipe(workspaceSlug, datasetId);

  useEffect(() => {
    if (dataset && !newDatasetName) {
      setNewDatasetName(`${dataset.name}_cleaned`);
    }
  }, [dataset, newDatasetName]);

  useEffect(() => {
    if (dataset) {
      previewMutation.mutate({ steps, limit, offset });
    }
  }, [steps, limit, offset, dataset]);

  const addStep = (newStep: CleaningStep) => {
    setSteps((prev) => [...prev, newStep]);
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleManualAdd = () => {
    if (stepType === "IMPUTE_NULL") {
      addStep({
        type: "IMPUTE_NULL",
        column: selectedCol,
        strategy: imputeStrategy,
        value: imputeStrategy === "CONSTANT" ? imputeValue : undefined,
      });
    } else if (stepType === "DROP_COLUMN") {
      addStep({ type: "DROP_COLUMN", column: selectedCol });
    } else if (stepType === "FILTER_ROWS") {
      addStep({ type: "FILTER_ROWS", condition: filterCond });
    } else if (stepType === "CAST_TYPE") {
      addStep({ type: "CAST_TYPE", column: selectedCol, target_type: targetType });
    } else if (stepType === "DERIVED_COLUMN") {
      addStep({
        type: "DERIVED_COLUMN",
        new_column: newColName,
        formula: derivedFormula,
      });
    }
  };

  const handleSaveRecipe = () => {
    saveMutation.mutate({
      name: recipeName,
      description: `Recipe with ${steps.length} transformations`,
      steps,
    });
  };

  const handleCommit = () => {
    commitMutation.mutate(
      {
        new_dataset_name: newDatasetName,
        steps,
      },
      {
        onSuccess: (newDs) => {
          setIsCommitModalOpen(false);
          router.push(`/dashboard/${workspaceSlug}/datasets/${newDs.id}`);
        },
      }
    );
  };

  const columnsList = dataset?.schema_metadata?.columns || [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Executive Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-4 shadow-xl">
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard/${workspaceSlug}/cleaning`}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                Transformation Studio
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">
                {dataset?.name || "Loading..."}
              </span>
            </div>
            <input
              type="text"
              value={recipeName}
              onChange={(e) => setRecipeName(e.target.value)}
              className="mt-0.5 bg-transparent text-lg font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 -ml-1 border-b border-transparent hover:border-slate-700"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveRecipe}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 border border-slate-700 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {saveMutation.isSuccess ? "Saved!" : "Save Recipe"}
          </button>
          <button
            onClick={() => setIsCommitModalOpen(true)}
            disabled={commitMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Commit & Materialize Dataset
          </button>
        </div>
      </div>

      {/* Main Grid: Left Toolbar (35%) & Right Preview Table (65%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Toolbar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl p-5 shadow-xl space-y-4">
            {/* Tabs Header */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <button
                onClick={() => setActiveTab("advisor")}
                className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
                  activeTab === "advisor"
                    ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                }`}
              >
                <Wand2 className="h-3.5 w-3.5" />
                AI Advisor ({recommendations?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("builder")}
                className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
                  activeTab === "builder"
                    ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                }`}
              >
                <Plus className="h-3.5 w-3.5" />
                Manual Step
              </button>
            </div>

            {/* AI Advisor Tab */}
            {activeTab === "advisor" && (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {!recommendations || recommendations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-2" />
                    <span className="text-xs font-semibold text-slate-300">
                      Zero AI Cleaning Alerts
                    </span>
                    <span className="text-xs text-slate-500 mt-1">
                      No missing values or constant columns detected.
                    </span>
                  </div>
                ) : (
                  recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">
                          {rec.title}
                        </span>
                        <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400 border border-amber-500/20">
                          {rec.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{rec.reason}</p>
                      <button
                        onClick={() => addStep(rec.step)}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600/20 py-1.5 text-xs font-semibold text-indigo-400 hover:bg-indigo-600 hover:text-white transition-colors border border-indigo-500/30"
                      >
                        <Wand2 className="h-3 w-3" />
                        Apply Fix
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Manual Builder Tab */}
            {activeTab === "builder" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Transformation Type
                  </label>
                  <select
                    value={stepType}
                    onChange={(e) =>
                      setStepType(e.target.value as CleaningStep["type"])
                    }
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="IMPUTE_NULL">Impute Missing Nulls</option>
                    <option value="DERIVED_COLUMN">Create Derived Column (SQL Formula)</option>
                    <option value="FILTER_ROWS">Filter Rows (SQL Condition)</option>
                    <option value="DROP_COLUMN">Drop Column</option>
                    <option value="CAST_TYPE">Cast Data Type</option>
                  </select>
                </div>

                {(stepType === "IMPUTE_NULL" ||
                  stepType === "DROP_COLUMN" ||
                  stepType === "CAST_TYPE") && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Target Column
                    </label>
                    <select
                      value={selectedCol}
                      onChange={(e) => setSelectedCol(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">Select a column...</option>
                      {columnsList.map((col) => (
                        <option key={col.name} value={col.name}>
                          {col.name} ({col.semantic_type})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {stepType === "IMPUTE_NULL" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Imputation Strategy
                      </label>
                      <select
                        value={imputeStrategy}
                        onChange={(e) =>
                          setImputeStrategy(e.target.value as any)
                        }
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="MEAN">Mean (Numeric Average)</option>
                        <option value="MEDIAN">Median (50th Percentile)</option>
                        <option value="MODE">Mode (Most Frequent Category)</option>
                        <option value="CONSTANT">Constant Value</option>
                      </select>
                    </div>
                    {imputeStrategy === "CONSTANT" && (
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Constant Value
                        </label>
                        <input
                          type="text"
                          value={imputeValue}
                          onChange={(e) => setImputeValue(e.target.value)}
                          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                )}

                {stepType === "DERIVED_COLUMN" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        New Column Name
                      </label>
                      <input
                        type="text"
                        value={newColName}
                        onChange={(e) => setNewColName(e.target.value)}
                        placeholder="e.g. profit_margin"
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        DuckDB SQL Formula
                      </label>
                      <input
                        type="text"
                        value={derivedFormula}
                        onChange={(e) => setDerivedFormula(e.target.value)}
                        placeholder="e.g. revenue - cost"
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}

                {stepType === "FILTER_ROWS" && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      SQL WHERE Condition
                    </label>
                    <input
                      type="text"
                      value={filterCond}
                      onChange={(e) => setFilterCond(e.target.value)}
                      placeholder="e.g. revenue > 0"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                )}

                <button
                  onClick={handleManualAdd}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20"
                >
                  <Plus className="h-4 w-4" />
                  Add Transformation Step
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Preview Table */}
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl p-5 shadow-xl space-y-4">
            {/* Active Recipe Steps Banner */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 mr-2">
                Active Recipe ({steps.length}):
              </span>
              {steps.length === 0 ? (
                <span className="text-xs text-slate-500 italic">
                  No transformations added yet. Select AI recommendations or add manual steps.
                </span>
              ) : (
                steps.map((st, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300 border border-indigo-500/20"
                  >
                    <span>
                      {st.type}: {st.column || st.new_column || st.condition}
                    </span>
                    <button
                      onClick={() => removeStep(idx)}
                      className="text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Preview Table Header */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">
                  Live DuckDB Data Preview
                </span>
                {previewMutation.data?.total_rows !== undefined && (
                  <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-mono text-slate-300">
                    {previewMutation.data.total_rows.toLocaleString()} Rows
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Rows per page:</span>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-200"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Table Container */}
            {previewMutation.isPending ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              </div>
            ) : previewMutation.isError ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
                Failed to execute transformation preview. Please check formula syntax.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      {previewMutation.data?.columns.map((colName) => (
                        <th key={colName} className="px-4 py-3 font-semibold">
                          {colName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/20">
                    {previewMutation.data?.rows.map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className="hover:bg-slate-800/40 transition-colors"
                      >
                        {previewMutation.data?.columns.map((colName) => (
                          <td key={colName} className="px-4 py-2.5 font-mono">
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

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-slate-400">
                Showing {offset + 1} -{" "}
                {Math.min(
                  offset + limit,
                  previewMutation.data?.total_rows || 0
                )}
              </span>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={
                  offset + limit >= (previewMutation.data?.total_rows || 0)
                }
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Materialization Commit Modal */}
      {isCommitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <Sparkles className="h-5 w-5" />
              <h3 className="text-base font-semibold text-white">
                Commit & Materialize Clean Dataset
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              This will compile your {steps.length} cleaning transformation steps into a
              brand new, permanent CSV dataset record in your workspace ready for Auto-ML
              and Auto-Dashboards.
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                New Dataset Version Name
              </label>
              <input
                type="text"
                value={newDatasetName}
                onChange={(e) => setNewDatasetName(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsCommitModalOpen(false)}
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCommit}
                disabled={commitMutation.isPending || !newDatasetName}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                {commitMutation.isPending ? "Materializing..." : "Create Clean Dataset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
