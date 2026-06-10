"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Activity, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { activityLink, formatLabel, timeAgo } from "@/lib/format";
import { CrmPageShell } from "@/components/dashboard/crm-page-shell";
import { SectionCard } from "@/components/dashboard/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListPageSkeleton } from "@/components/ui/skeleton";
import { FormField, SelectInput } from "@/components/ui/form-field";
import { useRouteColor } from "@/hooks/use-route-color";

type ActivityItem = {
  id: string;
  action: string;
  module: string;
  recordId?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  createdAt: string;
  user?: { id: string; name: string; email: string; role?: string } | null;
};

type ActivityResponse = { items: ActivityItem[]; total: number };

const MODULES = ["", "lead", "customer", "project", "invoice", "quotation"];

export default function ActivityPage() {
  const routeColor = useRouteColor();
  const [module, setModule] = useState("");
  const [action, setAction] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["activity-log", module, action],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (module) params.set("module", module);
      if (action) params.set("action", action);
      params.set("take", "100");
      const res = await api.get<ActivityResponse>(`/activity-log?${params}`);
      return res.data;
    },
    staleTime: 30_000,
  });

  const items = data?.items ?? [];

  return (
    <CrmPageShell
      hideHeader
      title=""
      toolbar={
        <>
          <FormField label="Module" className="w-36">
            <SelectInput
              value={module}
              onChange={setModule}
              options={MODULES.map((m) => ({
                value: m,
                label: m ? formatLabel(m) : "All modules",
              }))}
            />
          </FormField>
          <FormField label="Action" className="w-36">
            <SelectInput
              value={action}
              onChange={setAction}
              placeholder="All actions"
              options={[
                { value: "", label: "All actions" },
                { value: "create", label: "Create" },
                { value: "update", label: "Update" },
                { value: "delete", label: "Delete" },
              ]}
            />
          </FormField>
        </>
      }
    >
      <SectionCard accent={routeColor}>
        {isLoading ? (
          <ListPageSkeleton rows={8} columns={3} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No activity yet"
            description="Team actions across leads, customers, and billing will show here."
          />
        ) : (
          <ul className="divide-y divide-border/40">
            {items.map((item) => {
              const href = activityLink(item.module, item.recordId);
              return (
                <li key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{item.user?.name ?? "System"}</span>{" "}
                      <span className="text-muted-foreground">{formatLabel(item.action)}</span>{" "}
                      <span className="font-medium">{formatLabel(item.module)}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{timeAgo(item.createdAt)}</p>
                  </div>
                  {href ? (
                    <Link
                      href={href}
                      className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      View
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </CrmPageShell>
  );
}
