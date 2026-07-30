"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  MessageSquare,
  Sparkles,
  ArrowLeft,
  Database,
  Search,
  BookOpen,
  Terminal,
  Activity,
  Check,
  Copy,
  Trash2,
  BarChart3,
  TrendingUp,
  Table as TableIcon,
  PieChart,
  ShieldCheck,
  Bookmark,
  Play,
} from "lucide-react";
import { useDataset } from "@/hooks/use-datasets";
import {
  useAskNLQ,
  useNLQBookmarks,
  useCreateNLQBookmark,
  useDeleteNLQBookmark,
  NLQAskResponse,
} from "@/hooks/use-nlq";

export default function AskDataStudioPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params.workspaceSlug as string;
  const datasetId = params.datasetId as string;

  // Query & mutation hooks
  const { data: dataset, isLoading: isDsLoading } = useDataset(
    workspaceSlug,
    datasetId
  );
  const { data: bookmarks = [], isLoading: isBmLoading } = useNLQBookmarks(
    workspaceSlug,
    datasetId
  );
  const askMutation = useAskNLQ(workspaceSlug, datasetId);
  const createBookmarkMutation = useCreateNLQBookmark(workspaceSlug, datasetId);
  const deleteBookmarkMutation = useDeleteNLQBookmark(workspaceSlug, datasetId);

  // Local state
  const [questionInput, setQuestionInput] = useState(
    "Show me total revenue by region sorted from highest to lowest"
  );
  const [currentResult, setCurrentResult] = useState<NLQAskResponse | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<
    "RECOMMENDED" | "TABLE" | "SQL"
  >("RECOMMENDED");
  const [isBookmarkDrawerOpen, setIsBookmarkDrawerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bookmarkSuccess, setBookmarkSuccess] = useState(false);

  const handleAskQuestion = (q: string) => {
    if (!q || !q.trim()) return;
    setBookmarkSuccess(false);
    askMutation.mutate(
      { question: q.trim() },
      {
        onSuccess: (data) => {
          setCurrentResult(data);
          setActiveTab("RECOMMENDED");
        },
      }
    );
  };

  const handleCopySQL = (sql: string) => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveBookmark = () => {
    if (!currentResult) return;
    createBookmarkMutation.mutate(
      {
        question: currentResult.question,
        generated_sql: currentResult.generated_sql,
        chart_type: currentResult.recommended_chart_type,
      },
      {
        onSuccess: () => {
          setBookmarkSuccess(true);
          setTimeout(() => setBookmarkSuccess(false), 3000);
        },
      }
    );
  };

  const sampleQuestions = [
    "Show me total revenue by region sorted from highest to lowest",
    "Monthly trend of revenue over time",
    "What is the average revenue?",
    "Top 3 regions by total revenue",
  ];

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      {/* Top Navigation & Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <button
            onClick={() =>
              router.push(`/dashboard/${workspaceSlug}/nlq`)
            }
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium mb-3 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Ask Data Hub
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Ask Data Studio:{" "}
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
            Ask analytical questions in plain English. DecisionOS synthesizes safe DuckDB SQL and
            recommends executive visualizations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsBookmarkDrawerOpen(!isBookmarkDrawerOpen)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg border border-slate-700 transition-colors"
          >
            <Bookmark className="h-4 w-4 text-indigo-400" />
            <span>Bookmarks ({bookmarks.length})</span>
          </button>
        </div>
      </div>

      {/* Conversational Search Bar Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3">
          <Sparkles className="h-4 w-4" />
          Natural Language Question Bar
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAskQuestion(questionInput);
          }}
          className="flex flex-col md:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
            <input
              type="text"
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              placeholder="Ask a question in plain English (e.g. Show me total revenue by region)..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 text-sm focus:outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={askMutation.isPending || !questionInput.trim()}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-6 py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/20"
          >
            {askMutation.isPending ? (
              <>
                <Activity className="h-4 w-4 animate-spin" />
                Synthesizing SQL...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Ask DecisionOS
              </>
            )}
          </button>
        </form>

        {/* Prompt Suggestion Chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 mr-1">Suggested:</span>
          {sampleQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuestionInput(q);
                handleAskQuestion(q);
              }}
              className="px-3 py-1.5 bg-slate-800/60 hover:bg-indigo-950/60 border border-slate-700/80 hover:border-indigo-500/50 text-slate-300 hover:text-indigo-300 rounded-lg text-xs transition-colors"
            >
              &quot;{q}&quot;
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area: Results or Empty State */}
      {askMutation.isPending ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/40 border border-slate-800 rounded-2xl">
          <Activity className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
          <h3 className="text-base font-semibold text-white">
            Synthesizing DuckDB SQL...
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Analyzing schema semantics and verifying SQL AST read-only safety.
          </p>
        </div>
      ) : askMutation.isError ? (
        <div className="bg-red-950/20 border border-red-800/60 rounded-2xl p-6 text-red-300">
          <h3 className="font-bold text-sm mb-1">
            Query Synthesis Failed
          </h3>
          <p className="text-xs text-red-400">
            {askMutation.error?.message || "An error occurred while generating SQL."}
          </p>
        </div>
      ) : currentResult ? (
        <div className="space-y-6">
          {/* AI Executive Answer Banner */}
          <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900/80 to-purple-950/40 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      AI Executive Answer
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      AST Verified • {currentResult.execution_time_ms} ms
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-white mt-1">
                    &quot;{currentResult.question}&quot;
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveBookmark}
                  disabled={createBookmarkMutation.isPending}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-lg border border-slate-700 transition-colors"
                >
                  <Bookmark className="h-4 w-4 text-indigo-400" />
                  <span>
                    {bookmarkSuccess
                      ? "Bookmark Saved!"
                      : createBookmarkMutation.isPending
                      ? "Saving..."
                      : "Save Bookmark"}
                  </span>
                </button>
              </div>
            </div>

            {/* Natural Language Narrative Summary */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 text-sm text-slate-200 leading-relaxed">
              {currentResult.ai_answer}
            </div>
          </div>

          {/* Visualization Studio Tabs */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("RECOMMENDED")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === "RECOMMENDED"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  Recommended View ({currentResult.recommended_chart_type})
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
                  Table View ({currentResult.rows.length} rows)
                </button>
                <button
                  onClick={() => setActiveTab("SQL")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === "SQL"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  <Terminal className="h-4 w-4" />
                  Generated SQL Inspector
                </button>
              </div>
            </div>

            {/* TAB 1: RECOMMENDED VIEW */}
            {activeTab === "RECOMMENDED" && (
              <div>
                {currentResult.recommended_chart_type === "KPI_CARD" ? (
                  <div className="flex flex-col items-center justify-center py-12 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      {currentResult.columns[0] || "KPI Metric"}
                    </span>
                    <span className="text-4xl font-extrabold text-indigo-400 font-mono">
                      {currentResult.rows[0]?.[currentResult.columns[0]] !== undefined
                        ? typeof currentResult.rows[0][currentResult.columns[0]] === "number"
                          ? currentResult.rows[0][currentResult.columns[0]].toLocaleString()
                          : String(currentResult.rows[0][currentResult.columns[0]])
                        : "—"}
                    </span>
                  </div>
                ) : currentResult.recommended_chart_type === "LINE_CHART" ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Historical Line Chart Projections</span>
                      <span className="font-mono text-indigo-400">
                        X: {currentResult.columns[0]} • Y: {currentResult.columns[1]}
                      </span>
                    </div>
                    {/* Visual Bar/Line Graph proxy */}
                    <div className="space-y-3 bg-slate-950 p-6 rounded-xl border border-slate-800/80">
                      {currentResult.rows.map((r, i) => {
                        const val = Number(r[currentResult.columns[1]] || 0);
                        const maxVal = Math.max(
                          ...currentResult.rows.map((x) =>
                            Number(x[currentResult.columns[1]] || 1)
                          )
                        );
                        const widthPct = Math.max(
                          10,
                          Math.round((val / (maxVal || 1)) * 100)
                        );
                        return (
                          <div key={i} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono text-slate-300">
                                {String(r[currentResult.columns[0]])}
                              </span>
                              <span className="font-mono font-bold text-indigo-400">
                                {val.toLocaleString()}
                              </span>
                            </div>
                            <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${widthPct}%` }}
                                className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full transition-all duration-500"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* BAR_CHART or PIE_CHART default visual representation */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Categorical Ranking Bar Chart</span>
                      <span className="font-mono text-indigo-400">
                        Category: {currentResult.columns[0]} • Value:{" "}
                        {currentResult.columns[1]}
                      </span>
                    </div>
                    <div className="space-y-3 bg-slate-950 p-6 rounded-xl border border-slate-800/80">
                      {currentResult.rows.map((r, i) => {
                        const val = Number(r[currentResult.columns[1]] || 0);
                        const maxVal = Math.max(
                          ...currentResult.rows.map((x) =>
                            Number(x[currentResult.columns[1]] || 1)
                          )
                        );
                        const widthPct = Math.max(
                          10,
                          Math.round((val / (maxVal || 1)) * 100)
                        );
                        return (
                          <div key={i} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-300">
                                {String(r[currentResult.columns[0]])}
                              </span>
                              <span className="font-mono font-bold text-indigo-400">
                                {val.toLocaleString()}
                              </span>
                            </div>
                            <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${widthPct}%` }}
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: TABLE VIEW */}
            {activeTab === "TABLE" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-xs uppercase">
                      {currentResult.columns.map((col) => (
                        <th key={col} className="p-3 font-semibold">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {currentResult.rows.map((row, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-800/30 transition-colors"
                      >
                        {currentResult.columns.map((col) => (
                          <td
                            key={col}
                            className="p-3 font-mono text-xs text-slate-300"
                          >
                            {row[col] !== null && row[col] !== undefined
                              ? typeof row[col] === "number"
                                ? row[col].toLocaleString()
                                : String(row[col])
                              : "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 3: SQL QUERY INSPECTOR */}
            {activeTab === "SQL" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <Terminal className="h-4 w-4 text-indigo-400" />
                    <span>Vectorized DuckDB SQL Statement</span>
                  </div>
                  <button
                    onClick={() => handleCopySQL(currentResult.generated_sql)}
                    className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>Copy SQL</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-indigo-300 overflow-x-auto">
                  {currentResult.generated_sql}
                </pre>

                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span>Execution Time: {currentResult.execution_time_ms} ms</span>
                  <span>•</span>
                  <span>AST Status: Read-Only Validated</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-20 bg-slate-900/40 border border-slate-800 rounded-2xl">
          <MessageSquare className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">
            No Question Asked Yet
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Type an analytical question above or select a suggestion chip to generate SQL & visualizations.
          </p>
        </div>
      )}

      {/* Bookmarks Drawer / Sidebar Modal */}
      {isBookmarkDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 p-6 flex flex-col justify-between h-full shadow-2xl">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <Bookmark className="h-5 w-5 text-indigo-400" />
                  <h3 className="font-bold text-white text-base">
                    Saved NLQ Bookmarks
                  </h3>
                </div>
                <button
                  onClick={() => setIsBookmarkDrawerOpen(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Close ✕
                </button>
              </div>

              {isBmLoading ? (
                <div className="text-xs text-slate-400 py-8 text-center">
                  Loading bookmarks...
                </div>
              ) : bookmarks.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">
                    No bookmarks saved yet. Click &quot;Save Bookmark&quot; on any answer.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                  {bookmarks.map((bm) => (
                    <div
                      key={bm.id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                            {bm.chart_type}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(bm.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="font-bold text-white text-sm mt-2">
                          &quot;{bm.question}&quot;
                        </h4>
                        <p className="text-[11px] font-mono text-slate-400 truncate mt-1">
                          {bm.generated_sql}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                        <button
                          onClick={() => {
                            setQuestionInput(bm.question);
                            handleAskQuestion(bm.question);
                            setIsBookmarkDrawerOpen(false);
                          }}
                          className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                        >
                          <Play className="h-3.5 w-3.5" />
                          Re-run Question
                        </button>
                        <button
                          onClick={() => deleteBookmarkMutation.mutate(bm.id)}
                          disabled={deleteBookmarkMutation.isPending}
                          className="text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 text-center">
              <span className="text-[11px] text-slate-500">
                Bookmarks are shared across all workspace team members.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
