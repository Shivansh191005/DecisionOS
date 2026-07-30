"use client";

import React, { useState } from "react";
import { Check, ChevronDown, Plus, Sparkles } from "lucide-react";
import { useWorkspace } from "@/hooks/use-workspace";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

export function WorkspaceSwitcher() {
  const {
    organizations,
    activeOrganization,
    workspaces,
    activeWorkspace,
    switchOrganization,
    switchWorkspace,
    createWorkspace,
    isCreatingWorkspace,
  } = useWorkspace();

  const [isNewWsOpen, setIsNewWsOpen] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [newWsDesc, setNewWsDesc] = useState("");

  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    createWorkspace(
      { name: newWsName.trim(), description: newWsDesc.trim() },
      {
        onSuccess: () => {
          setIsNewWsOpen(false);
          setNewWsName("");
          setNewWsDesc("");
        },
      }
    );
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center gap-2 px-3 py-1.5 h-9 bg-card/60 hover:bg-card border-white/10 text-sm font-semibold shadow-sm backdrop-blur-md"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="truncate max-w-[140px]">
              {activeOrganization?.name || "Select Org"}
            </span>
            <span className="text-muted-foreground">/</span>
            <span className="truncate max-w-[140px] text-primary">
              {activeWorkspace?.name || "Select Workspace"}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 p-2">
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-1">
            Workspaces ({workspaces.length})
          </DropdownMenuLabel>
          <div className="max-h-56 overflow-y-auto space-y-1 my-1">
            {workspaces.map((ws) => {
              const isActive = activeWorkspace?.id === ws.id;
              return (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => switchWorkspace(ws)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer ${
                    isActive
                      ? "bg-primary/20 text-primary font-semibold"
                      : "hover:bg-accent"
                  }`}
                >
                  <span className="truncate">{ws.name}</span>
                  {isActive && <Check className="w-4 h-4 text-primary" />}
                </DropdownMenuItem>
              );
            })}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setIsNewWsOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-primary font-semibold hover:bg-primary/10 rounded-lg cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Workspace</span>
          </DropdownMenuItem>

          {organizations.length > 1 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-1">
                Organizations
              </DropdownMenuLabel>
              {organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => switchOrganization(org)}
                  className="px-3 py-1.5 text-xs rounded-lg cursor-pointer"
                >
                  {org.name}
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isNewWsOpen} onOpenChange={setIsNewWsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
            <DialogDescription>
              Workspaces isolate datasets, dashboards, AI chats, and reports.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateWorkspace} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Workspace Name
              </label>
              <Input
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
                placeholder="e.g. Q3 Executive Intelligence"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Description (Optional)
              </label>
              <Input
                value={newWsDesc}
                onChange={(e) => setNewWsDesc(e.target.value)}
                placeholder="Revenue forecasts and anomaly tracking"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNewWsOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingWorkspace}>
                {isCreatingWorkspace ? "Creating..." : "Create Workspace"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
