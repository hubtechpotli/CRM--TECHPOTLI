"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PIPELINE_STATUSES, getStatusMeta } from "@/lib/lead-ui";

export function LeadPipelineStepper({ currentStatus }: { currentStatus: string }) {
  const currentIdx = PIPELINE_STATUSES.indexOf(currentStatus as (typeof PIPELINE_STATUSES)[number]);
  const resolvedIdx = currentStatus === "LOST" ? -1 : currentStatus === "ON_HOLD" ? currentIdx : currentIdx;

  return (
    <div className="mt-6 overflow-x-auto pb-1">
      <div className="flex min-w-[640px] items-center gap-0">
        {PIPELINE_STATUSES.map((status, i) => {
          const meta = getStatusMeta(status);
          const Icon = meta.icon;
          const isPast = resolvedIdx >= 0 && i < resolvedIdx;
          const isCurrent = status === currentStatus;
          const isFuture = resolvedIdx >= 0 ? i > resolvedIdx : false;

          return (
            <div key={status} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 text-white shadow-sm transition",
                    isCurrent && cn(meta.columnAccent, "border-transparent text-white shadow-md"),
                    isPast && cn(meta.columnAccent, "border-transparent"),
                    isFuture && "border-border bg-muted text-muted-foreground",
                    !isCurrent && !isPast && !isFuture && "border-border bg-background text-muted-foreground",
                  )}
                >
                  {isPast ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className={cn("h-3.5 w-3.5", isCurrent ? "text-white" : isFuture ? "text-muted-foreground" : meta.text)} />
                  )}
                </div>
                <span
                  className={cn(
                    "max-w-[80px] text-center text-[10px] font-semibold leading-tight",
                    isCurrent ? meta.text : "text-muted-foreground",
                  )}
                >
                  {meta.label}
                </span>
              </div>
              {i < PIPELINE_STATUSES.length - 1 ? (
                <div
                  className={cn(
                    "mx-1 h-1 flex-1 rounded-full",
                    isPast ? meta.columnAccent : "bg-border",
                  )}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
