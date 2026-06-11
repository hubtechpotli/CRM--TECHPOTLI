"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, MessageSquare } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthReady } from "@/hooks/use-auth-ready";
import type { GlobalWorkItem, TeamFeedResponse, TeamUpdatesSummary } from "@/lib/team-updates";
import { normalizePaginated } from "@/lib/pagination";
import { TEAM_FEED_STALE_MS } from "@/lib/query-stale";
export function TeamUpdatesPanel() {
  const { authReady } = useAuthReady();

  const { data: summary } = useQuery({
    queryKey: ["team-updates-summary"],
    queryFn: async () => {
      const res = await api.get<TeamUpdatesSummary>("/team-updates/summary");
      return res.data;
    },
    enabled: authReady,
    staleTime: TEAM_FEED_STALE_MS,
    refetchInterval: TEAM_FEED_STALE_MS,
  });

  const { data: feedPage, isLoading } = useQuery({
    queryKey: ["team-updates-feed", "dashboard", 5],
    queryFn: async () => {
      const res = await api.get<TeamFeedResponse | GlobalWorkItem[]>("/team-updates/feed", {
        params: { limit: 5, page: 1 },
      });
      return normalizePaginated<GlobalWorkItem>(res.data);
    },
    enabled: authReady,
    staleTime: TEAM_FEED_STALE_MS,
    refetchInterval: TEAM_FEED_STALE_MS,
  });

  const items = feedPage?.data ?? [];
  const openCount = summary?.openTotal ?? 0;
  const hasOpen = openCount > 0;

  return (
    <div
      className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm"
      style={{ boxShadow: "var(--card-shadow)" }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/50 bg-muted/20 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MessageSquare className="h-3.5 w-3.5" />
          </div>
          <p className="text-xs font-semibold text-foreground">Team updates</p>
          {hasOpen ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-200/80 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {openCount} open
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground">· All caught up</span>
          )}
        </div>
        <Link href="/team-updates" className="text-[10px] font-medium text-primary hover:underline">
          View all
        </Link>
      </div>

      <div className="p-2">
        {isLoading ? (
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/60" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-between gap-2 px-2 py-2">
            <p className="text-xs text-muted-foreground">No open team updates</p>
            <Link href="/team-updates" className="text-[10px] font-semibold text-primary hover:underline">
              Post update →
            </Link>
          </div>
        ) : (
          <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const customerId = String(item.customerId ?? item.customer?.id ?? "");
              return (
                <li key={item.id}>
                  <Link
                    href={`/customers/${customerId}?tab=teamWork`}
                    className="flex items-center gap-2 rounded-lg border border-border/40 px-2.5 py-2 transition hover:border-primary/30 hover:bg-primary/5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{item.title}</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {item.customer?.companyName ?? "Customer"}
                        {item.assignedTo?.name ? ` · ${item.assignedTo.name}` : ""}
                      </p>
                    </div>
                    <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
