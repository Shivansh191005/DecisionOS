"use client";

import React from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bot,
  BrainCircuit,
  Database,
  FileSpreadsheet,
  FileText,
  Layers,
  Settings,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/hooks/use-workspace";

export function AppSidebar() {
  const pathname = usePathname();
  const params = useParams();
  const { activeWorkspace } = useWorkspace();
  const urlSlug =
    typeof params?.workspaceSlug === "string" ? params.workspaceSlug : null;
  let slug = urlSlug || activeWorkspace?.slug || "main";
  if (slug === "dashboard") slug = "main";

  const navigationItems = [
    {
      title: "Workspace Hub",
      href: `/dashboard/${slug}`,
      icon: Layers,
      badge: "Core",
    },
    {
      title: "Data Ingestion",
      href: `/dashboard/${slug}/ingest`,
      icon: Database,
      badge: "Module 2",
    },
    {
      title: "Data Cleaning",
      href: `/dashboard/${slug}/cleaning`,
      icon: FileSpreadsheet,
      badge: "Module 3",
    },
    {
      title: "EDA & Insights",
      href: `/dashboard/${slug}/eda`,
      icon: BarChart3,
      badge: "Module 4",
    },
    {
      title: "Forecasting",
      href: `/dashboard/${slug}/forecasting`,
      icon: TrendingUp,
      badge: "Module 5",
    },
    {
      title: "Ask Data (NLQ)",
      href: `/dashboard/${slug}/nlq`,
      icon: Bot,
      badge: "Module 6",
    },
    {
      title: "Explainable AI (XAI)",
      href: `/dashboard/${slug}/xai`,
      icon: BrainCircuit,
      badge: "Module 7",
    },
    {
      title: "Prescriptive AI",
      href: `/dashboard/${slug}/optimization`,
      icon: Zap,
      badge: "Module 8",
    },
    {
      title: "Executive Briefings",
      href: `/dashboard/${slug}/briefing`,
      icon: FileText,
      badge: "Module 9",
    },
    {
      title: "Workspace Settings",
      href: `/dashboard/${slug}/settings`,
      icon: Settings,
      badge: "RBAC",
    },
  ];

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-white/10 dark:border-white/5 bg-card/40 backdrop-blur-xl p-4 space-y-6">
      <div className="space-y-1">
        <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Platform Capabilities
        </p>
        <nav className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const isCurrentModule = item.badge === "Core" || item.badge === "RBAC";

            return (
              <Link
                key={item.title}
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold transition-all group",
                  isActive
                    ? "bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-600/20 text-primary border border-primary/20 shadow-sm"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "w-4 h-4 transition-colors",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  <span>{item.title}</span>
                </div>
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-medium",
                    isCurrentModule
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {item.badge}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-4 rounded-xl border border-white/10 bg-gradient-to-b from-card to-card/50 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-primary">
          <Activity className="w-4 h-4 animate-pulse" />
          <span>Platform Health: Online</span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Celery Workers: 4 queues active
          <br />
          PostgreSQL 16 & Redis connected
        </p>
      </div>
    </aside>
  );
}
