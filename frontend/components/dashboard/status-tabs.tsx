"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export type StatusTab = { value: string; label: string };

export function StatusTabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: StatusTab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <Tabs.Root value={value} onValueChange={onChange}>
      <Tabs.List
        className={cn(
          "flex flex-wrap gap-1 rounded-xl border border-border/60 bg-muted/40 p-1",
          className,
        )}
      >
        {tabs.map((tab) => (
          <Tabs.Trigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition",
              "data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm",
              "hover:text-foreground",
            )}
          >
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}
