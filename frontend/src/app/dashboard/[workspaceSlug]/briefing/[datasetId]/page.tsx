"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Award,
  Sparkles,
  FileText,
  Download,
  Copy,
  Check,
  MessageSquare,
  Send,
  Layers,
  Activity,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Sliders,
  CheckCircle2,
  Share2,
  Database,
  BarChart3,
} from "lucide-react";
import { useDataset } from "@/hooks/use-datasets";
import {
  useGenerateBriefing,
  useBriefingQna,
  BriefingResponse,
  BriefingSection,
  BriefingQnaResponse,
} from "@/hooks/use-briefing";

export default function ExecutiveBriefingStudioPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params.workspaceSlug as string;
  const datasetId = params.datasetId as string;

  // Fetch dataset info
  const { data: dataset, isLoading: isDatasetLoading } = useDataset(
    workspaceSlug,
    datasetId
  );

  // TanStack Query hooks
  const generateMutation = useGenerateBriefing(workspaceSlug, datasetId);
  const qnaMutation = useBriefingQna(workspaceSlug, datasetId);

  // Configuration state
  const [reportTitle, setReportTitle] = useState(
    "Strategic Decision Briefing & Executive Action Plan"
  );
  const [targetColumn, setTargetColumn] = useState("");
  const [includeForecasting, setIncludeForecasting] = useState(true);
  const [includeXai, setIncludeXai] = useState(true);
  const [includeOptimization, setIncludeOptimization] = useState(true);
  const [executiveNotes, setExecutiveNotes] = useState(
    "Prioritize sales expansion in top-performing segments and audit underperforming SMB retention."
  );

  // Active Studio Mode: SECTIONS | MEMO | QNA
  const [activeMode, setActiveMode] = useState<"SECTIONS" | "MEMO" | "QNA">(
    "SECTIONS"
  );

  // Briefing Report State
  const [briefing, setBriefing] = useState<BriefingResponse | null>(null);
  const [copied, setCopied] = useState(false);

  // Q&A Conversational State
  const [questionInput, setQuestionInput] = useState("");
  const [qnaHistory, setQnaHistory] = useState<
    Array<{ q: string; a: string; metric: string; confidence: number }>
  >([]);

  // Discover candidate numeric column for Target KPI
  // Discover candidate numeric column for Target KPI
  const candidateColumns = React.useMemo((): string[] => {
    const cols = (dataset as any)?.columns;
    if (!cols || !Array.isArray(cols)) return ["revenue"];
    const nums = cols
      .filter((c: any) =>
        [
          "INTEGER",
          "BIGINT",
          "DOUBLE",
          "FLOAT",
          "DECIMAL",
          "NUMERIC",
          "INT",
        ].includes(String(c?.data_type || "").toUpperCase())
      )
      .map((c: any) => String(c?.name || "revenue"));
    return nums.length > 0 ? nums : ["revenue"];
  }, [dataset]);

  useEffect(() => {
    if (candidateColumns.length > 0 && !targetColumn) {
      setTargetColumn(candidateColumns[0]);
    }
  }, [candidateColumns, targetColumn]);

  // Handle Briefing Generation
  const handleGenerateBriefing = () => {
    generateMutation.mutate(
      {
        title: reportTitle,
        target_column: targetColumn || candidateColumns[0] || "revenue",
        include_forecasting: includeForecasting,
        include_xai: includeXai,
        include_optimization: includeOptimization,
        executive_notes: executiveNotes,
      },
      {
        onSuccess: (data) => {
          setBriefing(data);
          setActiveMode("SECTIONS");
        },
      }
    );
  };

  // Auto-generate on mount once dataset is loaded
  useEffect(() => {
    if (dataset && !briefing && !generateMutation.isPending) {
      handleGenerateBriefing();
    }
  }, [dataset]);

  // Copy Markdown Memo to Clipboard
  const handleCopyMemo = () => {
    if (!briefing) return;
    navigator.clipboard.writeText(briefing.executive_memo_markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Download Standalone Markdown (.md)
  const handleDownloadMarkdown = () => {
    if (!briefing) return;
    const blob = new Blob([briefing.executive_memo_markdown], {
      type: "text/markdown;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `executive_briefing_${briefing.dataset_name.replace(/\s+/g, "_")}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download Formatted HTML Report (.html)
  const handleDownloadHtml = () => {
    if (!briefing) return;
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${briefing.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; line-height: 1.6; max-width: 900px; margin: 0 auto; }
    h1 { color: #818cf8; border-bottom: 2px solid #334155; padding-bottom: 10px; }
    h2 { color: #38bdf8; margin-top: 30px; }
    .badge { background: rgba(129, 140, 248, 0.2); color: #818cf8; padding: 4px 10px; border-radius: 9999px; font-weight: 600; font-size: 13px; display: inline-block; margin-bottom: 15px; }
    .recommendation { background: rgba(16, 185, 129, 0.15); border-left: 4px solid #10b981; padding: 12px 16px; margin: 20px 0; border-radius: 4px; }
    .footer { margin-top: 50px; font-size: 12px; color: #64748b; border-top: 1px solid #334155; padding-top: 20px; }
  </style>
</head>
<body>
  <h1>${briefing.title}</h1>
  <p><strong>Dataset:</strong> ${briefing.dataset_name} | <strong>Target KPI:</strong> ${targetColumn || "revenue"}</p>
  <p><em>Generated on ${new Date(briefing.generated_at).toLocaleString()} by DecisionOS AI Executive Co-Pilot</em></p>
  <hr style="border-color: #334155;" />

  ${
    executiveNotes
      ? `<div class="recommendation" style="border-color: #818cf8; background: rgba(129, 140, 248, 0.1);"><strong>Executive Context:</strong> ${executiveNotes}</div>`
      : ""
  }

  ${briefing.sections
    .map(
      (sec) => `
    <h2>${sec.title}</h2>
    <div class="badge">${sec.badge_text}</div>
    <p>${sec.summary_text}</p>
    ${
      sec.recommendation
        ? `<div class="recommendation"><strong>Actionable Recommendation:</strong> ${sec.recommendation}</div>`
        : ""
    }
  `
    )
    .join("")}

  <div class="footer">
    Report generated automatically by DecisionOS — Enterprise Decision Intelligence Platform.
  </div>
</body>
</html>
    `;
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `executive_briefing_${briefing.dataset_name.replace(/\s+/g, "_")}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Q&A Submission
  const handleAskQuestion = (customQ?: string) => {
    const q = customQ || questionInput;
    if (!q || !q.trim()) return;

    qnaMutation.mutate(
      {
        question: q.trim(),
        target_column: targetColumn || candidateColumns[0] || "revenue",
      },
      {
        onSuccess: (res) => {
          setQnaHistory((prev) => [
            ...prev,
            {
              q: res.question,
              a: res.answer_text,
              metric: res.supporting_metric,
              confidence: res.confidence_score,
            },
          ]);
          setQuestionInput("");
        },
      }
    );
  };

  // Section icon resolver
  const getSectionIcon = (sectionId: string) => {
    switch (sectionId) {
      case "DATA_HEALTH":
        return <Database className="h-5 w-5 text-indigo-400" />;
      case "EDA_STATS":
        return <BarChart3 className="h-5 w-5 text-sky-400" />;
      case "FORECAST":
        return <TrendingUp className="h-5 w-5 text-emerald-400" />;
      case "XAI_ROOT_CAUSE":
        return <Layers className="h-5 w-5 text-purple-400" />;
      case "PRESCRIPTIVE_PLAN":
        return <Award className="h-5 w-5 text-amber-400" />;
      default:
        return <FileText className="h-5 w-5 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-8 p-8">
      {/* SaaS Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Award className="h-4 w-4" />
            C-Suite Decision Briefing Presentation Room
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Executive Briefing Studio:{" "}
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
            Synthesize insights from across Data Health, EDA, Forecasting, Driver Trees, and Prescriptive
            Optimization into an executive boardroom presentation report.
          </p>
        </div>

        {/* Health Score & Latency Badge Banner */}
        {briefing && (
          <div className="flex items-center gap-3">
            <div className="bg-slate-900/90 border border-slate-800 px-4 py-2.5 rounded-xl flex items-center gap-3 shadow-lg">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  Overall Health Score
                </span>
                <span className="text-sm font-bold text-white font-mono">
                  {briefing.overall_health_score.toFixed(1)} / 100
                </span>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 px-4 py-2.5 rounded-xl flex items-center gap-3 shadow-lg">
              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                <Sparkles className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  Synthesis Latency
                </span>
                <span className="text-sm font-bold text-white font-mono">
                  {briefing.execution_time_ms} ms
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Report Configuration Panel */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            <Sliders className="h-4 w-4" />
            Briefing Report Configuration &amp; Scope
          </div>
          <span className="text-xs text-slate-400">
            Select modules to synthesize into the C-Suite executive memo
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Report Title */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Report Title
            </label>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder="e.g. Q3 C-Suite Boardroom Strategic Review"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Target KPI Column Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Primary Target KPI
            </label>
            <select
              value={targetColumn}
              onChange={(e) => setTargetColumn(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              {candidateColumns.map((col: string) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          {/* Scope Toggle Switches */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Analytical Module Scope
            </label>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeForecasting}
                  onChange={(e) => setIncludeForecasting(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-0"
                />
                Forecasting
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeXai}
                  onChange={(e) => setIncludeXai(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-0"
                />
                Driver Trees
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeOptimization}
                  onChange={(e) => setIncludeOptimization(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-0"
                />
                Prescriptive
              </label>
            </div>
          </div>
        </div>

        {/* Executive Notes / Directive */}
        <div className="mt-6">
          <label className="block text-xs font-medium text-slate-300 mb-2">
            C-Suite Directive / Executive Context
          </label>
          <textarea
            rows={2}
            value={executiveNotes}
            onChange={(e) => setExecutiveNotes(e.target.value)}
            placeholder="Enter custom C-suite strategic notes or board directives to weave into the Executive Memo..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleGenerateBriefing}
            disabled={generateMutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all duration-200 disabled:opacity-50 cursor-pointer"
          >
            {generateMutation.isPending ? (
              <>
                <Activity className="h-4 w-4 animate-spin" />
                Synthesizing Multi-Module Briefing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Executive Decision Briefing
              </>
            )}
          </button>
        </div>
      </div>

      {/* Studio Mode Navigation Switcher */}
      {briefing && (
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveMode("SECTIONS")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-semibold text-xs transition-colors ${
                activeMode === "SECTIONS"
                  ? "bg-slate-800 text-white border-b-2 border-indigo-500"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Layers className="h-4 w-4" />
              1. Interactive Briefing Sections ({briefing.sections.length})
            </button>

            <button
              onClick={() => setActiveMode("MEMO")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-semibold text-xs transition-colors ${
                activeMode === "MEMO"
                  ? "bg-slate-800 text-white border-b-2 border-indigo-500"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FileText className="h-4 w-4" />
              2. C-Suite Markdown Memo &amp; Export
            </button>

            <button
              onClick={() => setActiveMode("QNA")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-semibold text-xs transition-colors ${
                activeMode === "QNA"
                  ? "bg-slate-800 text-white border-b-2 border-indigo-500"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              3. Strategic Co-Pilot Q&amp;A
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMemo}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy Memo
                </>
              )}
            </button>
            <button
              onClick={handleDownloadMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Markdown (.md)
            </button>
            <button
              onClick={handleDownloadHtml}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5" />
              HTML Report
            </button>
          </div>
        </div>
      )}

      {/* MODE 1: Interactive Briefing Sections */}
      {briefing && activeMode === "SECTIONS" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {briefing.sections.map((sec) => (
              <div
                key={sec.section_id}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-800 rounded-xl">
                      {getSectionIcon(sec.section_id)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {sec.title}
                      </h3>
                      <span className="text-xs text-slate-400">
                        Section ID:{" "}
                        <span className="font-mono text-indigo-400">
                          {sec.section_id}
                        </span>
                      </span>
                    </div>
                  </div>

                  <span className="px-3 py-1 text-xs font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 rounded-full self-start">
                    {sec.badge_text}
                  </span>
                </div>

                {/* Plain-English Executive Summary */}
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  {sec.summary_text}
                </p>

                {/* Key Metrics Pills */}
                {sec.metrics && Object.keys(sec.metrics).length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y border-slate-800/80 mb-6">
                    {Object.entries(sec.metrics).map(([key, value]) => (
                      <div
                        key={key}
                        className="bg-slate-950/60 rounded-lg p-3 border border-slate-800/60"
                      >
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                          {key.replace(/_/g, " ")}
                        </span>
                        <span className="text-sm font-bold text-white font-mono mt-0.5 block">
                          {typeof value === "number"
                            ? value.toLocaleString()
                            : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actionable Recommendation Callout Box */}
                {sec.recommendation && (
                  <div className="p-4 bg-emerald-950/20 border border-emerald-800/50 rounded-xl flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
                        Actionable Boardroom Recommendation
                      </span>
                      <p className="text-xs text-emerald-200 mt-1">
                        {sec.recommendation}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODE 2: C-Suite Markdown Memo & Export */}
      {briefing && activeMode === "MEMO" && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              <FileText className="h-4 w-4" />
              Formatted C-Suite Strategic Memo (Markdown &amp; Presentation Ready)
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Target KPI: {targetColumn || "revenue"}
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-6 overflow-x-auto font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
            {briefing.executive_memo_markdown}
          </div>

          <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
            <span>
              Generated automatically by DecisionOS AI Executive Co-Pilot on{" "}
              {new Date(briefing.generated_at).toLocaleString()}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCopyMemo}
                className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer flex items-center gap-1"
              >
                {copied ? "Copied to Clipboard" : "Copy Complete Memo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: Strategic Co-Pilot Q&A */}
      {briefing && activeMode === "QNA" && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                <MessageSquare className="h-4 w-4" />
                Interactive Boardroom Strategic Q&amp;A
              </div>
              <span className="text-xs text-slate-400">
                Ask strategic drill-down questions over dataset metrics
              </span>
            </div>

            {/* Prompt Suggestion Chips */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="text-xs text-slate-400 font-medium">
                Suggested Prompts:
              </span>
              {[
                "What is our primary growth driver?",
                "What is our biggest risk factor or drag?",
                "What is our projected forecast growth?",
                "How should we reallocate our budget?",
              ].map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleAskQuestion(prompt)}
                  disabled={qnaMutation.isPending}
                  className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full text-xs font-medium border border-slate-700/60 transition-all cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Q&A Chat History */}
            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 mb-6">
              {qnaHistory.length === 0 ? (
                <div className="text-center py-12 bg-slate-950/40 border border-slate-800/60 rounded-xl text-slate-500 text-xs">
                  No questions asked yet. Select a suggested prompt above or enter a question below.
                </div>
              ) : (
                qnaHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-5 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                        <HelpCircle className="h-4 w-4" />
                        {item.q}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 rounded-full font-mono">
                        Confidence: {item.confidence.toFixed(1)}%
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed">
                      {item.a}
                    </p>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">
                        Supporting DuckDB Metric:{" "}
                        <span className="font-mono text-emerald-400 font-semibold">
                          {item.metric}
                        </span>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Question Input Bar */}
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAskQuestion()}
                placeholder="Ask the AI Executive Co-Pilot a strategic question about this dataset..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => handleAskQuestion()}
                disabled={qnaMutation.isPending || !questionInput.trim()}
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer"
              >
                {qnaMutation.isPending ? (
                  <Activity className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Ask Co-Pilot
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
