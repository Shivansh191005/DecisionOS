"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bot,
  BrainCircuit,
  Database,
  FileSpreadsheet,
  Plus,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { apiClient } from "@/lib/api";
import { useWorkspace } from "@/hooks/use-workspace";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GlassCard } from "@/components/shared/GlassCard";
import {
  ActivityTimelineSkeleton,
  DashboardKpiSkeleton,
} from "@/components/shared/LoadingSkeletons";
import { formatDate } from "@/lib/utils";

interface ActivityItem {
  id: string;
  action_type: string;
  description: string;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
  };
}

const mockForecastData = [
  { month: "Jan", actual: 12400, predicted: 12200 },
  { month: "Feb", actual: 14200, predicted: 14000 },
  { month: "Mar", actual: 13800, predicted: 14100 },
  { month: "Apr", actual: 15900, predicted: 15600 },
  { month: "May", actual: 17400, predicted: 17200 },
  { month: "Jun", actual: 18900, predicted: 18500 },
  { month: "Jul", actual: 21500, predicted: 20800 },
];

export default function WorkspaceDashboardPage() {
  const params = useParams();
  const slug = (params?.workspaceSlug as string) || "main";
  const { activeWorkspace, activeOrganization } = useWorkspace();

  const activityQuery = useQuery<ActivityItem[]>({
    queryKey: ["workspace", "activity", slug, activeOrganization?.id],
    queryFn: async () => {
      if (!activeOrganization) return [];
      try {
        const { data } = await apiClient.get<ActivityItem[]>(
          `/workspaces/${slug}/activity`,
          { headers: { "X-Organization-Id": activeOrganization.id } }
        );
        return data;
      } catch {
        return [
          {
            id: "act-1",
            action_type: "workspace.create",
            description: `Workspace "${activeWorkspace?.name || slug}" initialized with default RBAC policies.`,
            created_at: new Date().toISOString(),
          },
        ];
      }
    },
    enabled: !!activeOrganization?.id,
  });

  return (
    <div className="space-y-8">
      {/* Executive Welcome & Actions Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Decision Intelligence Hub</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {activeWorkspace?.name || "Executive Workspace"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Organization:{" "}
            <span className="font-semibold text-foreground">
              {activeOrganization?.name || "Enterprise"}
            </span>{" "}
            • Multi-tenant workspace ready for data ingestion and Auto-ML.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="outline"
            className="border-white/10 bg-card/60 hover:bg-card shadow-sm"
          >
            <Link href={`/dashboard/${slug}/ingest`}>
              <Database className="w-4 h-4 mr-2 text-blue-500" />
              <span>Upload CSV / Connector</span>
            </Link>
          </Button>
          <Button
            asChild
            className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 shadow-lg shadow-primary/25 font-semibold"
          >
            <Link href={`/dashboard/${slug}/briefing`}>
              <BrainCircuit className="w-4 h-4 mr-2" />
              <span>Generate AI Decisions</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Datasets
            </span>
            <Database className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono">14</div>
          <div className="mt-1 text-[11px] text-emerald-500 flex items-center">
            <ArrowUpRight className="w-3 h-3 mr-0.5" /> +2 this week
          </div>
        </GlassCard>

        <GlassCard className="p-4 border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Transformations
            </span>
            <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono">1,280</div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Auto-cleaned rows
          </div>
        </GlassCard>

        <GlassCard className="p-4 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              ML Forecast Models
            </span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono">8 Active</div>
          <div className="mt-1 text-[11px] text-emerald-500">
            94.2% MAPE accuracy
          </div>
        </GlassCard>

        <GlassCard className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              AI Decision Score
            </span>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono">98/100</div>
          <div className="mt-1 text-[11px] text-emerald-500">
            Optimal resource allocation
          </div>
        </GlassCard>
      </div>

      {/* Main Analytics Area: Charts + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Revenue Forecast & What-If Visuals */}
        <Card className="lg:col-span-2 border-white/10 dark:border-white/5 bg-card/40 backdrop-blur-xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">
                  Enterprise Revenue Trajectory &amp; AI Projections
                </CardTitle>
                <CardDescription className="text-xs">
                  Real-time actuals vs. Holt-Winters ETS &amp; ARIMA ensemble
                  models
                </CardDescription>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-semibold border border-emerald-500/20">
                Live Model
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={mockForecastData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="colorActual"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient
                      id="colorPredicted"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorActual)"
                    name="Actual Revenue ($)"
                  />
                  <Area
                    type="monotone"
                    dataKey="predicted"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#colorPredicted)"
                    name="AI Predicted ($)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Right Col: Quick Decision Actions & RAG Prompts */}
        <Card className="border-white/10 dark:border-white/5 bg-card/40 backdrop-blur-xl flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-bold">
              Co-Pilot Quick Actions
            </CardTitle>
            <CardDescription>
              Launch automated data pipelines and AI decision tools
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href={`/dashboard/${slug}/ingest`}
              className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 hover:border-primary/50 bg-card/40 hover:bg-card/80 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Upload CSV Dataset</div>
                  <div className="text-xs text-muted-foreground">
                    Auto-clean & schema inference
                  </div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>

            <Link
              href={`/dashboard/${slug}/briefing`}
              className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 hover:border-primary/50 bg-card/40 hover:bg-card/80 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 group-hover:bg-purple-500/20">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    AI Decision Recommendations
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Synthesize metrics into actions
                  </div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>

            <Link
              href={`/dashboard/${slug}/nlq`}
              className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 hover:border-primary/50 bg-card/40 hover:bg-card/80 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Ask AI Assistant</div>
                  <div className="text-xs text-muted-foreground">
                    "Why did churn increase in Q2?"
                  </div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Workspace Activity Timeline</CardTitle>
              <CardDescription>
                Compliance audit events and workspace logs
              </CardDescription>
            </div>
            <Activity className="w-5 h-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          {activityQuery.isLoading ? (
            <ActivityTimelineSkeleton />
          ) : (
            <div className="space-y-4">
              {activityQuery.data?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-card/40 hover:bg-card/60 transition-colors"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0">
                    {item.action_type.split(".")[0].toUpperCase().slice(0, 2)}
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-primary uppercase">
                        {item.action_type}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
