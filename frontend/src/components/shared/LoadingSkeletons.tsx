import React from "react";
import { cn } from "@/lib/utils";

export function ShimmerSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:400%_100%]",
        className
      )}
      {...props}
    />
  );
}

export function DashboardKpiSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="p-6 rounded-xl border border-white/10 bg-card/60 backdrop-blur-xl space-y-3"
        >
          <div className="flex justify-between items-center">
            <ShimmerSkeleton className="h-4 w-24" />
            <ShimmerSkeleton className="h-6 w-6 rounded-full" />
          </div>
          <ShimmerSkeleton className="h-8 w-32" />
          <ShimmerSkeleton className="h-3 w-40" />
        </div>
      ))}
    </div>
  );
}

export function ActivityTimelineSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-start gap-4 p-4 rounded-xl border border-white/10 bg-card/40"
        >
          <ShimmerSkeleton className="w-10 h-10 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <ShimmerSkeleton className="h-4 w-48" />
            <ShimmerSkeleton className="h-3 w-full max-w-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}
