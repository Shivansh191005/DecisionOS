"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FileText,
  Sparkles,
  ArrowRight,
  Database,
  Layers,
  Activity,
  Award,
  BookOpen,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import { useDatasets } from "@/hooks/use-datasets";

export default function ExecutiveBriefingHubPage() {
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
            <Award className="h-4 w-4" />
            C-Suite Decision Briefings
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            AI Executive Co-Pilot &amp; Decision Briefing Studio
          </h1>
          <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
            Synthesize insights across Data Health, EDA, Forecasting, Explainable AI, and Prescriptive
            Optimization into unified, exportable C-Suite strategic presentation memos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-indigo-950/50 border border-indigo-500/30 rounded-lg px-4 py-2.5">
            <Sparkles className="h-4 w-4 text-indigo-400 animate-pulse" />
            <span className="text-xs font-medium text-indigo-200">
              5-Module Synthesis • Standalone Markdown Export • Co-Pilot Q&amp;A
            </span>
          </div>
        </div>
      </div>

      {/* Feature Highlight Banners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-white text-base">Multi-Module Synthesis</h3>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">
            Automatically aggregates Data Health scores, Correlation pairs, Exponential smoothing trends,
            Shapley attributions, and Simplex resource allocations into one report.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-white text-base">C-Suite Markdown Memos</h3>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">
            Generates structured Roman numeral executive memos titled &quot;Strategic Decision Briefing&quot;
            ready for one-click clipboard copy and boardroom presentation.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-white text-base">Strategic Co-Pilot Q&amp;A</h3>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">
            Ask follow-up questions to the AI Co-Pilot to drill into primary growth drivers, negative drag
            factors, and optimal capital allocation multiples.
          </p>
        </div>
      </div>

      {/* Datasets Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-400" />
            Select a Workspace Dataset for an Executive Briefing
          </h2>
          <span className="text-xs text-slate-400">
            Showing {datasets?.length || 0} active datasets
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 bg-slate-900/40 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-3 text-slate-400 text-sm">
              <Activity className="h-5 w-5 animate-spin text-indigo-500" />
              Loading workspace datasets...
            </div>
          </div>
        ) : isError ? (
          <div className="p-6 bg-red-950/20 border border-red-800/50 rounded-xl text-red-300 text-sm">
            Failed to load datasets. Please verify your workspace permissions.
          </div>
        ) : !datasets || datasets.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-xl">
            <Layers className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">No Datasets Available</h3>
            <p className="text-xs text-slate-400 mt-1">
              Upload a dataset in the Data Ingestion Studio to start generating executive briefings.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {datasets.map((ds) => (
              <div
                key={ds.id}
                onClick={() =>
                  router.push(`/dashboard/${workspaceSlug}/briefing/${ds.id}`)
                }
                className="group bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-500/10 group-hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base group-hover:text-indigo-300 transition-colors">
                          {ds.name}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                          {ds.file_name}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full uppercase tracking-wider">
                      {ds.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 py-3 border-y border-slate-800/80 text-xs">
                    <div>
                      <span className="text-slate-400 block">Total Rows</span>
                      <span className="font-semibold text-white font-mono">
                        {ds.row_count ? ds.row_count.toLocaleString() : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Columns</span>
                      <span className="font-semibold text-white font-mono">
                        {ds.column_count || "—"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="text-[11px] font-medium text-slate-400 block mb-2">
                      Briefing Scope Included:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 bg-slate-800/80 text-indigo-300 text-[11px] rounded">
                        Forecasting
                      </span>
                      <span className="px-2 py-0.5 bg-slate-800/80 text-emerald-300 text-[11px] rounded">
                        Driver Trees
                      </span>
                      <span className="px-2 py-0.5 bg-slate-800/80 text-purple-300 text-[11px] rounded">
                        Prescriptive Plan
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-3 flex items-center justify-between text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
                  <span>Launch Executive Presentation Room</span>
                  <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
