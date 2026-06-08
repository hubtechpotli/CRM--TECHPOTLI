"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PIPELINE_STATUSES, getStatusMeta } from "@/lib/lead-ui";

export function LeadPipelineStepper({ currentStatus }: { currentStatus: string }) {
  const currentIdx = PIPELINE_STATUSES.indexOf(currentStatus as (typeof PIPELINE_STATUSES)[number]);
  const resolvedIdx = currentStatus === "LOST" ? -1 : currentStatus === "ON_HOLD" ? currentIdx : currentIdx;

  return (
    <div className="mt-6 overflow-x-auto pb-1">
      <div className="flex min-w-[520px] items-center gap-0">
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
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition",
                    isCurrent && "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25",
                    isPast && "border-emerald-500 bg-emerald-500 text-white",
                    isFuture && "border-border bg-muted text-muted-foreground",
                    !isCurrent && !isPast && !isFuture && "border-border bg-background text-muted-foreground",
                  )}
                >
                  {isPast ? <Check className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
                <span
                  className={cn(
                    "max-w-[72px] text-center text-[10px] font-medium leading-tight",
                    isCurrent ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {meta.label}
                </span>
              </div>
              {i < PIPELINE_STATUSES.length - 1 ? (
                <div
                  className={cn(
                    "mx-1 h-0.5 flex-1 rounded-full",
                    isPast ? "bg-emerald-500" : "bg-border",
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
