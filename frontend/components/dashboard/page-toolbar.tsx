"use client";

import { cn } from "@/lib/utils";

export function PageToolbar({
  title,
  description,
  search,
  filters,
  actions,
  className,
}: {
  title: string;
  description?: string;
  search?: React.ReactNode;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {search}
          {actions}
        </div>
      </div>
      {filters ? <div>{filters}</div> : null}
    </div>
  );
}
