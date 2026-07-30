"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Command as CommandPrimitive } from "cmdk";
import {
  BarChart3,
  Bot,
  Database,
  Layers,
  Search,
  Settings,
  Sparkles,
  Zap,
} from "lucide-react";

import { useAppStore } from "@/store/use-app-store";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

export function CommandPalette() {
  const router = useRouter();
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    workspaces,
    activeWorkspace,
    setActiveWorkspace,
  } = useAppStore();

  const handleSelect = (callback: () => void) => {
    callback();
    setCommandPaletteOpen(false);
  };

  const slug = activeWorkspace?.slug || "main";

  return (
    <Dialog open={isCommandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-card/90 backdrop-blur-3xl border border-white/10 shadow-2xl">
        <CommandPrimitive className="w-full">
          <div className="flex items-center border-b border-white/10 px-4 py-3">
            <Search className="w-4 h-4 text-muted-foreground mr-3" />
            <CommandPrimitive.Input
              placeholder="Search workspaces, dashboards, datasets, or ask AI..."
              className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          <CommandPrimitive.List className="max-h-96 overflow-y-auto p-2 space-y-2">
            <CommandPrimitive.Empty className="py-6 text-center text-sm text-muted-foreground">
              No matching commands or resources found.
            </CommandPrimitive.Empty>

            <CommandPrimitive.Group heading="Navigation">
              <div className="px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground">
                Workspace Navigation
              </div>
              <CommandPrimitive.Item
                onSelect={() =>
                  handleSelect(() => router.push(`/dashboard/${slug}`))
                }
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-white/10 cursor-pointer"
              >
                <Layers className="w-4 h-4 text-primary" />
                <span>Go to Workspace Hub</span>
              </CommandPrimitive.Item>
              <CommandPrimitive.Item
                onSelect={() =>
                  handleSelect(() => router.push(`/dashboard/${slug}/settings`))
                }
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-white/10 cursor-pointer"
              >
                <Settings className="w-4 h-4 text-muted-foreground" />
                <span>Workspace RBAC & Settings</span>
              </CommandPrimitive.Item>
            </CommandPrimitive.Group>

            <CommandPrimitive.Group heading="AI Quick Actions">
              <div className="px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground mt-2">
                AI Quick Actions
              </div>
              <CommandPrimitive.Item
                onSelect={() =>
                  handleSelect(() =>
                    router.push(`/dashboard/${slug}/decisions`)
                  )
                }
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-primary/20 text-primary cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Executive AI Decision Recommendations</span>
              </CommandPrimitive.Item>
              <CommandPrimitive.Item
                onSelect={() =>
                  handleSelect(() => router.push(`/dashboard/${slug}/chat`))
                }
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-white/10 cursor-pointer"
              >
                <Bot className="w-4 h-4 text-purple-400" />
                <span>Ask AI Assistant ("Why did sales decrease?")</span>
              </CommandPrimitive.Item>
            </CommandPrimitive.Group>

            {workspaces.length > 0 && (
              <CommandPrimitive.Group heading="Switch Workspace">
                <div className="px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground mt-2">
                  Switch Active Workspace
                </div>
                {workspaces.map((ws) => (
                  <CommandPrimitive.Item
                    key={ws.id}
                    onSelect={() =>
                      handleSelect(() => {
                        setActiveWorkspace(ws);
                        router.push(`/dashboard/${ws.slug}`);
                      })
                    }
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold hover:bg-white/10 cursor-pointer"
                  >
                    <span>{ws.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {ws.slug}
                    </span>
                  </CommandPrimitive.Item>
                ))}
              </CommandPrimitive.Group>
            )}
          </CommandPrimitive.List>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  );
}
