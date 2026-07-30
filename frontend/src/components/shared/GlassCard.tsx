import React from "react";
import { cn } from "@/lib/utils";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
}

export function GlassCard({
  className,
  children,
  glow = false,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-white/10 dark:border-white/5 bg-card/60 backdrop-blur-2xl p-6 shadow-2xl transition-all duration-300",
        glow && "hover:shadow-[0_0_35px_rgba(37,99,235,0.15)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
