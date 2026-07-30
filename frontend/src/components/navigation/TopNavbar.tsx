"use client";

import React from "react";
import Link from "next/link";
import { Bell, Command, LogOut, Moon, Search, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";

import { useAuth } from "@/hooks/use-auth";
import { useAppStore } from "@/store/use-app-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

export function TopNavbar() {
  const { user, logout } = useAuth();
  const { toggleCommandPalette } = useAppStore();
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-white/10 dark:border-white/5 bg-card/60 backdrop-blur-xl px-6">
      <div className="flex items-center gap-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-extrabold text-lg tracking-tight"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white font-bold shadow-md">
            D
          </div>
          <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            DecisionOS
          </span>
        </Link>
        <WorkspaceSwitcher />
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={toggleCommandPalette}
          className="hidden md:flex items-center gap-3 h-9 px-3 rounded-lg bg-background/40 hover:bg-background/80 border-white/10 text-xs text-muted-foreground"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search data, insights, or ask AI...</span>
          <kbd className="inline-flex items-center gap-0.5 rounded border border-white/10 bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-9 w-9 rounded-lg hover:bg-white/10"
          title="Toggle color theme"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-lg hover:bg-white/10"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary animate-pulse" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="flex items-center gap-2 h-9 px-3 rounded-lg border-white/10 bg-card/60 hover:bg-card"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
              </div>
              <span className="text-xs font-semibold max-w-[100px] truncate">
                {user?.full_name || "Enterprise User"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-semibold truncate">
                  {user?.full_name}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>Account Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={toggleCommandPalette}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Command className="w-4 h-4" />
                <span>Command Palette</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">
                ⌘K
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout()}
              className="flex items-center gap-2 text-destructive focus:bg-destructive/10"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
