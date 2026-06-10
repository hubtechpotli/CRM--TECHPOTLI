"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeatureColor } from "@/lib/feature-colors";

export function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  hint,
  className,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: FeatureColor;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg border bg-card p-2.5 transition-shadow hover:shadow-sm",
        color.border,
        className,
      )}
      style={{ boxShadow: "var(--card-shadow)" }}
      title={hint}
    >
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white shadow-sm",
          color.solid,
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-base font-bold leading-none tabular-nums tracking-tight", color.text)}>
          {value}
        </p>
        <p className="mt-0.5 truncate text-[10px] font-medium text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
