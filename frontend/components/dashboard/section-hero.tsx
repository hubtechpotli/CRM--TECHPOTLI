"use client";

import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import type { FeatureColor } from "@/lib/feature-colors";

export function SectionHero({
  group,
  title,
  description,
  color,
  icon: Icon,
  metrics,
  className,
}: {
  group?: string;
  title: string;
  description?: string;
  color: FeatureColor;
  icon?: ComponentType<{ className?: string }>;
  metrics?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "relative overflow-hidden rounded-lg border border-border/60 bg-card",
        className,
      )}
      style={{ boxShadow: "var(--card-shadow)" }}
    >
      <div
        className={cn("flex items-center gap-2.5 px-3 py-2 sm:gap-3 sm:px-3.5 sm:py-2.5", color.light)}
        style={{ borderLeft: `3px solid ${color.spark}` }}
      >
        {Icon ? (
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white shadow-sm sm:h-8 sm:w-8",
              color.solid,
            )}
          >
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-2">
            {group ? (
              <span
                className={cn(
                  "hidden shrink-0 text-[10px] font-semibold uppercase tracking-wider sm:inline",
                  color.text,
                )}
              >
                {group}
              </span>
            ) : null}
            <h1 className="shrink-0 text-sm font-semibold tracking-tight text-foreground sm:text-[15px]">
              {title}
            </h1>
            {description ? (
              <p className="min-w-0 truncate text-[11px] text-muted-foreground sm:text-xs">
                <span className="hidden text-muted-foreground/50 sm:inline">— </span>
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {metrics ? (
        <div className={cn("border-t px-3 py-2 sm:px-3.5", color.border)}>{metrics}</div>
      ) : null}
    </header>
  );
}
