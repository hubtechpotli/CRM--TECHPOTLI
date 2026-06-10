"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MessageSquare, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthReady } from "@/hooks/use-auth-ready";
import type { GlobalWorkItem, TeamFeedResponse, TeamUpdatesSummary } from "@/lib/team-updates";
import { normalizePaginated } from "@/lib/pagination";
import { formatDateTime, formatLabel } from "@/lib/format";
import { SectionCard } from "@/components/dashboard/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function TeamUpdatesPanel({ highlighted = false }: { highlighted?: boolean }) {
  const { authReady } = useAuthReady();

  const { data: summary } = useQuery({
    queryKey: ["team-updates-summary"],
    queryFn: async () => {
      const res = await api.get<TeamUpdatesSummary>("/team-updates/summary");
      return res.data;
    },
    enabled: authReady,
    refetchInterval: 60_000,
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
    refetchInterval: 60_000,
  });

  const items = feedPage?.data ?? [];

  const hasOpen = (summary?.openTotal ?? 0) > 0;
  const showHighlight = highlighted || hasOpen;

  return (
    <SectionCard
      noPadding
      className={cn(
        showHighlight &&
          "border-primary/40 bg-gradient-to-br from-primary/[0.07] via-card to-amber-500/[0.06] shadow-md shadow-primary/10 ring-2 ring-primary/25",
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4",
          showHighlight
            ? "border-primary/20 bg-primary/[0.06]"
            : "border-border/50 bg-muted/30",
        )}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl",
              showHighlight ? "bg-primary text-primary-foreground shadow-sm" : "bg-primary/10 text-primary",
            )}
          >
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Team updates</p>
            <p className="text-xs text-muted-foreground">Open tasks and requests across customers</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasOpen ? (
            <>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground">
                <Sparkles className="h-3 w-3" />
                {summary!.openTotal} open
              </span>
              {summary!.assignedToMe > 0 ? (
                <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                  {summary!.assignedToMe} for you
                </span>
              ) : null}
            </>
          ) : (
            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              All caught up
            </span>
          )}
          <Link href="/team-updates" className="text-xs font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
      </div>

      <div className="p-5">
        {isLoading ? (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-6 text-center">
            <MessageSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No open team updates</p>
            <Link href="/team-updates" className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
              Post an update
            </Link>
          </div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              const customerId = String(item.customerId ?? item.customer?.id ?? "");
              return (
                <li key={item.id}>
                  <Link
                    href={`/customers/${customerId}?tab=teamWork`}
                    className={cn(
                      "flex h-full items-start gap-3 rounded-xl border px-3 py-2.5 transition",
                      showHighlight
                        ? "border-primary/25 bg-white/60 hover:border-primary/50 hover:bg-primary/5 dark:bg-slate-900/40"
                        : "border-border/40 hover:border-primary/30 hover:bg-primary/5",
                    )}
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.customer?.companyName ?? "Customer"}
                        {item.assignedTo?.name ? ` · ${item.assignedTo.name}` : ""}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 font-medium",
                            item.status === "IN_PROGRESS"
                              ? "bg-amber-500/10 text-amber-700"
                              : "bg-primary/10 text-primary",
                          )}
                        >
                          {formatLabel(String(item.status ?? "OPEN"))}
                        </span>
                        <span>{formatDateTime(item.createdAt)}</span>
                      </div>
                    </div>
                    <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </SectionCard>
  );
}
