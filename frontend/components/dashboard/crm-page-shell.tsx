"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { StatusTabs, type StatusTab } from "@/components/dashboard/status-tabs";
import { getRouteColor } from "@/lib/nav-colors";
import type { FeatureColor } from "@/lib/feature-colors";

export function CrmPageShell({
  title,
  description,
  hideHeader,
  tabs,
  tabValue,
  onTabChange,
  toolbar,
  children,
  className,
  accent,
}: {
  title: string;
  description?: string;
  hideHeader?: boolean;
  /** @deprecated Actions live in the top bar — not rendered here */
  actions?: React.ReactNode;
  tabs?: StatusTab[];
  tabValue?: string;
  onTabChange?: (value: string) => void;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  accent?: FeatureColor;
}) {
  const pathname = usePathname();
  const routeColor = accent ?? getRouteColor(pathname);

  return (
    <div className={cn("crm-page space-y-4", className)}>
      {!hideHeader && title ? (
        <div
          className={cn(
            "rounded-2xl border border-border/70 bg-card px-4 py-3.5 shadow-sm",
            routeColor.border,
          )}
          style={{ boxShadow: "var(--card-shadow)" }}
        >
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}

      {tabs && tabValue !== undefined && onTabChange ? (
        <StatusTabs tabs={tabs} value={tabValue} onChange={onTabChange} accent={routeColor} />
      ) : null}

      {toolbar ? (
        <div className={cn("crm-filter-bar", routeColor.border)}>{toolbar}</div>
      ) : null}

      {children}
    </div>
  );
}
