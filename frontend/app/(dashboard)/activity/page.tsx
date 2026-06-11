"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Activity, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { activityLink, formatLabel, timeAgo } from "@/lib/format";
import { actionBadgeFor, moduleColorFor } from "@/lib/activity-ui";
import { CrmPageShell } from "@/components/dashboard/crm-page-shell";
import { SectionCard } from "@/components/dashboard/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListPageSkeleton } from "@/components/ui/skeleton";
import { FormField, SelectInput } from "@/components/ui/form-field";
import { UserAvatar } from "@/components/ui/user-avatar";
import { LIST_STALE_MS } from "@/lib/query-stale";
import { useRouteColor } from "@/hooks/use-route-color";
import { cn } from "@/lib/utils";

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

const MODULES = ["", "lead", "customer", "project", "invoice", "quotation", "payment", "expense", "support"];

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
    staleTime: LIST_STALE_MS,
  });

  const items = data?.items ?? [];

  return (
    <CrmPageShell
      hideHeader
      title=""
      toolbar={
        <>
          <FormField label="Module" className="w-40">
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
          <ul className="relative space-y-0">
            <div className="absolute bottom-2 left-5 top-2 w-px bg-border/70" aria-hidden />
            {items.map((item, index) => {
              const href = activityLink(item.module, item.recordId);
              const actor = item.user?.name ?? "System";
              const modColor = moduleColorFor(item.module);
              const actBadge = actionBadgeFor(item.action);

              return (
                <li
                  key={item.id}
                  className="relative flex gap-3 rounded-xl px-1 py-3 transition hover:bg-muted/30 first:pt-0 last:pb-0"
                >
                  <div className="relative z-10 shrink-0 pt-0.5">
                    <UserAvatar name={actor} size="sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="min-w-0 text-sm leading-snug text-foreground">
                        <span className="font-semibold">{actor}</span>{" "}
                        <span className="text-muted-foreground">{actBadge.label.toLowerCase()}</span>{" "}
                        <span className={cn("font-medium", modColor.text)}>{formatLabel(item.module)}</span>
                      </p>
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        {index === 0 ? (
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                              routeColor.light,
                              routeColor.text,
                            )}
                          >
                            Latest
                          </span>
                        ) : null}
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                            actBadge.light,
                            actBadge.text,
                            actBadge.border,
                          )}
                        >
                          {actBadge.label}
                        </span>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                            modColor.light,
                            modColor.text,
                            modColor.border,
                          )}
                        >
                          {formatLabel(item.module)}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(item.createdAt)}</p>
                  </div>
                  {href ? (
                    <Link
                      href={href}
                      className={cn(
                        "flex shrink-0 items-center gap-1 self-center text-xs font-semibold transition hover:underline",
                        modColor.text,
                      )}
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
