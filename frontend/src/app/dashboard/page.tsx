"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/use-app-store";

export default function DashboardIndexPage() {
  const router = useRouter();
  const { activeWorkspace, workspaces } = useAppStore();

  useEffect(() => {
    let slug =
      activeWorkspace?.slug ||
      workspaces.find((ws) => ws.is_default)?.slug ||
      "main";
    if (slug === "dashboard") slug = "main";
    router.replace(`/dashboard/${slug}`);
  }, [activeWorkspace, workspaces, router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center space-y-2">
        <div className="flex h-10 w-10 items-center justify-center mx-auto rounded-xl bg-primary/20 text-primary font-bold">
          D
        </div>
        <p className="text-sm text-muted-foreground">
          Loading default workspace...
        </p>
      </div>
    </div>
  );
}
