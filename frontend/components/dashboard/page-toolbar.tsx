"use client";

import { cn } from "@/lib/utils";

export function PageToolbar({
  title,
  description,
  search,
  filters,
  actions,
  hideTitle,
  className,
}: {
  title: string;
  description?: string;
  hideTitle?: boolean;
  search?: React.ReactNode;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("crm-page", hideTitle ? "space-y-0" : "space-y-3", className)}>
      {!hideTitle ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {search}
            {actions}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {search}
          {actions}
        </div>
      )}
      {filters ? <div className="crm-filter-bar">{filters}</div> : null}
    </div>
  );
}
