"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Activity, ExternalLink, Filter } from "lucide-react";
import { api } from "@/lib/api";
import { activityLink, formatLabel, timeAgo } from "@/lib/format";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { FormField, SelectInput } from "@/components/ui/form-field";

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
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team activity"
        description="See who did what across leads, customers, projects, and billing."
      />

      <GlassCard>
        <div className="mb-4 flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" />
            Filters
          </div>
          <FormField label="Module" className="w-40">
            <SelectInput
              value={module}
              onChange={setModule}
              options={[
                { value: "", label: "All modules" },
                ...MODULES.filter(Boolean).map((m) => ({ value: m, label: formatLabel(m) })),
              ]}
            />
          </FormField>
          <FormField label="Action" className="w-52">
            <SelectInput
              value={action}
              onChange={setAction}
              options={[
                { value: "", label: "All actions" },
                { value: "LEAD_ASSIGNED", label: "Lead assigned" },
                { value: "LEAD_STATUS_CHANGED", label: "Lead status changed" },
                { value: "LEAD_ACTIVITY_LOGGED", label: "Lead activity logged" },
                { value: "LEAD_CONVERTED", label: "Lead converted" },
                { value: "PROJECT_STATUS_CHANGED", label: "Project status changed" },
                { value: "WO_ACCEPTED", label: "Work order accepted" },
                { value: "INVOICE_CREATED", label: "Invoice created" },
                { value: "CREDENTIALS_VIEWED", label: "Credentials viewed" },
                { value: "PORTAL_VISIT", label: "Portal visit" },
              ]}
            />
          </FormField>
          {data?.total != null ? (
            <p className="ml-auto text-sm text-muted-foreground">{data.total} events</p>
          ) : null}
        </div>

        {isLoading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Loading activity…</p>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <Activity className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="font-medium">No activity yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Team actions will show up here as they happen.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => {
              const link = activityLink(item.module, item.recordId);
              const actor = item.user?.name ?? item.user?.email ?? "System";
              return (
                <li
                  key={item.id}
                  className="flex items-start gap-4 rounded-lg border border-border/40 bg-white/40 px-4 py-3 transition hover:border-primary/20 hover:bg-white/60 dark:bg-slate-900/30 dark:hover:bg-slate-900/50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {actor.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-semibold">{actor}</span>
                      <span className="text-muted-foreground"> · {formatLabel(item.action)}</span>
                      <span className="text-muted-foreground"> on {formatLabel(item.module)}</span>
                    </p>
                    {item.newValue ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {JSON.stringify(item.newValue).slice(0, 120)}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[10px] text-muted-foreground">{timeAgo(item.createdAt)}</p>
                  </div>
                  {link ? (
                    <Link
                      href={link}
                      className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-primary transition hover:bg-primary/10"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
