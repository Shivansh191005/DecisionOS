"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { TopNavbar } from "@/components/navigation/TopNavbar";
import { AppSidebar } from "@/components/navigation/AppSidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user && typeof window !== "undefined") {
      const token = localStorage.getItem("decisionos_access_token");
      if (!token) {
        router.push("/login");
      }
    }
  }, [isLoading, user, router]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNavbar />
      <div className="flex flex-1">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
