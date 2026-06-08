"use client";

import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { api } from "@/lib/api";
import type { TeamUpdatesSummary } from "@/lib/team-updates";
import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { TeamUpdatesFeed } from "@/components/team-updates/team-updates-feed";

export default function TeamUpdatesPage() {
  const { data: summary } = useQuery({
    queryKey: ["team-updates-summary"],
    queryFn: async () => {
      const res = await api.get<TeamUpdatesSummary>("/team-updates/summary");
      return res.data;
    },
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-5">
      <PageToolbar
        title="Team Updates"
        description="Every update across all customers — assigned work, open tasks, and team requests in one place."
      />

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { label: "Open items", value: summary.openTotal },
            { label: "Assigned to me", value: summary.assignedToMe },
            { label: "Unassigned", value: summary.unassignedOpen },
            { label: "New today", value: summary.newToday },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3"
            >
              <MessageSquare className="h-5 w-5 text-primary" />
              <div>
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <TeamUpdatesFeed />
    </div>
  );
}
