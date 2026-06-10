"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
import type { FeatureColor } from "@/lib/feature-colors";

export type StatusTab = { value: string; label: string; count?: number };

export function StatusTabs({
  tabs,
  value,
  onChange,
  className,
  accent,
}: {
  tabs: StatusTab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  accent?: FeatureColor;
}) {
  return (
    <Tabs.Root value={value} onValueChange={onChange}>
      <Tabs.List
        className={cn(
          "flex gap-0.5 overflow-x-auto rounded-lg border bg-card/50 p-0.5 scrollbar-none",
          accent?.border ?? "border-border",
          className,
        )}
      >
        {tabs.map((tab) => (
          <Tabs.Trigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition",
              "hover:text-foreground",
              accent
                ? cn(
                    "data-[state=active]:font-semibold data-[state=active]:shadow-sm",
                    accent.light,
                    accent.text,
                    accent.border,
                    "data-[state=active]:border",
                  )
                : "data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm",
            )}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums",
                  accent
                    ? cn(accent.iconBg, accent.iconColor)
                    : "bg-primary/10 text-primary",
                )}
              >
                {tab.count > 99 ? "99+" : tab.count}
              </span>
            ) : null}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}
