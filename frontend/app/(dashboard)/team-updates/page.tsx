"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Inbox,
  MessageSquare,
  BellRing,
  UserCheck,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthReady } from "@/hooks/use-auth-ready";
import type { TeamUpdatesSummary } from "@/lib/team-updates";
import { TeamUpdatesFeed } from "@/components/team-updates/team-updates-feed";
import { FEATURE } from "@/lib/feature-colors";
import { cn } from "@/lib/utils";

type StatKey = "open" | "mine" | "unassigned" | "today";

const STAT_CARDS: Array<{
  key: StatKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: (typeof FEATURE)[keyof typeof FEATURE];
  filterStatus: string;
  dateRange?: "" | "today";
}> = [
  {
    key: "open",
    label: "Open items",
    icon: Inbox,
    color: FEATURE.open,
    filterStatus: "open",
  },
  {
    key: "mine",
    label: "Assigned to me",
    icon: UserCheck,
    color: FEATURE.mine,
    filterStatus: "mine",
  },
  {
    key: "unassigned",
    label: "Unassigned",
    icon: Users,
    color: FEATURE.unassigned,
    filterStatus: "unassigned",
  },
  {
    key: "today",
    label: "New today",
    icon: Calendar,
    color: FEATURE.newToday,
    filterStatus: "all",
    dateRange: "today",
  },
];

export default function TeamUpdatesPage() {
  const { authReady } = useAuthReady();
  const [statusFilter, setStatusFilter] = useState("open");
  const [dateRange, setDateRange] = useState<"" | "today" | "7d" | "30d">("");
  const [activeStat, setActiveStat] = useState<StatKey | null>("open");

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["team-updates-summary"],
    queryFn: async () => {
      const res = await api.get<TeamUpdatesSummary>("/team-updates/summary");
      return res.data;
    },
    enabled: authReady,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  function applyStat(stat: (typeof STAT_CARDS)[number]) {
    setActiveStat(stat.key);
    setStatusFilter(stat.filterStatus);
    setDateRange(stat.dateRange ?? "");
  }

  function statValue(key: StatKey) {
    if (!summary) return "—";
    if (key === "open") return summary.openTotal;
    if (key === "mine") return summary.assignedToMe;
    if (key === "unassigned") return summary.unassignedOpen;
    return summary.newToday;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-sm",
                FEATURE.teamUpdates.solid,
              )}
            >
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                <span className={FEATURE.teamUpdates.text}>Team Updates</span>
              </h1>
              <p className="text-xs text-muted-foreground">
                All customer work, tasks &amp; requests — assign with @mentions
              </p>
            </div>
          </div>
        </div>
        {summary && summary.assignedToMe > 0 ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[10px] font-semibold",
              FEATURE.mine.light,
              FEATURE.mine.border,
              FEATURE.mine.text,
            )}
          >
            <BellRing className="h-3 w-3" />
            {summary.assignedToMe} assigned to you
          </span>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map((stat) => {
          const Icon = stat.icon;
          const active = activeStat === stat.key;
          return (
            <button
              key={stat.key}
              type="button"
              onClick={() => applyStat(stat)}
              className={cn(
                "group flex items-center gap-3 rounded-xl border bg-card p-3 text-left transition",
                active
                  ? cn(stat.color.border, "shadow-md ring-1", stat.color.ring)
                  : cn(stat.color.border, "opacity-90 hover:shadow-sm", stat.color.hoverBg),
              )}
              style={{ boxShadow: active ? undefined : "var(--card-shadow)" }}
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white shadow-sm",
                  stat.color.solid,
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className={cn("text-xl font-bold leading-none tabular-nums", stat.color.text)}>
                  {summaryLoading ? "…" : statValue(stat.key)}
                </p>
                <p className="mt-0.5 truncate text-[10px] font-medium text-muted-foreground">{stat.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      <TeamUpdatesFeed
        statusFilter={statusFilter}
        onStatusFilterChange={(v) => {
          setStatusFilter(v);
          setActiveStat(null);
        }}
        dateRange={dateRange}
        onDateRangeChange={(v) => {
          setDateRange(v);
          if (v !== "today") setActiveStat(null);
        }}
      />
    </div>
  );
}
