import React from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyStateCard({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-white/10 dark:border-white/5 bg-card/20 backdrop-blur-xl space-y-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-lg">
        {icon || <Sparkles className="h-8 w-8" />}
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="text-lg font-bold tracking-tight">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="font-semibold mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
