"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function UploadProgress({
  percent,
  label = "Uploading…",
  className,
  indeterminate,
}: {
  percent: number;
  label?: string;
  className?: string;
  indeterminate?: boolean;
}) {
  const display = indeterminate ? null : `${Math.min(100, Math.max(0, percent))}%`;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          {label}
        </span>
        {display ? <span className="font-medium tabular-nums text-foreground">{display}</span> : null}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full bg-primary transition-all duration-300 ease-out",
            indeterminate && "w-1/3 animate-pulse",
          )}
          style={indeterminate ? undefined : { width: `${Math.min(100, Math.max(2, percent))}%` }}
        />
      </div>
    </div>
  );
}

export function SaveProgress({
  stage,
  percent,
}: {
  stage: "uploading" | "saving" | "done";
  percent?: number;
}) {
  if (stage === "done") {
    return (
      <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Saved successfully</p>
    );
  }
  const label = stage === "uploading" ? "Uploading file…" : "Saving to server…";
  return (
    <UploadProgress
      percent={stage === "saving" ? (percent ?? 90) : (percent ?? 0)}
      label={label}
      indeterminate={stage === "saving" && percent == null}
    />
  );
}
