"use client";

import Link from "next/link";
import { memo } from "react";
import { Medal, Trophy } from "lucide-react";
import { SectionCard } from "@/components/dashboard/section-card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";
import { isSuperAdmin } from "@/lib/roles";
import { useAuthStore } from "@/store/auth-store";

type Salesperson = {
  id: string;
  name: string;
  leads: number;
  convertedLeads: number;
  progressPct: number;
};

const RANK_STYLES = [
  "bg-amber-600 text-white",
  "bg-zinc-500 text-white",
  "bg-zinc-400 text-white",
] as const;

export const TopSalespeople = memo(function TopSalespeople({
  people,
  loading,
}: {
  people: Salesperson[];
  loading?: boolean;
}) {
  const superAdmin = isSuperAdmin(useAuthStore((s) => s.user?.role));

  return (
    <SectionCard
      title="Top Performers"
      subtitle="This month"
      icon={Trophy}
      compact
    >
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/60" />
          ))}
        </div>
      ) : people.length === 0 ? (
        <div className="py-6 text-center">
          <Medal className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No sales data yet.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {people.slice(0, 3).map((person, index) => (
            <li
              key={person.id}
              className={cn(
                "rounded-lg border border-border p-2 transition hover:bg-muted/40",
                index === 0 && "border-amber-200/60 bg-amber-50/50 dark:border-amber-500/20 dark:bg-amber-950/20",
              )}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <UserAvatar name={person.name} size="sm" />
                  <span
                    className={cn(
                      "absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold shadow-sm",
                      RANK_STYLES[index] ?? "bg-muted text-foreground",
                    )}
                  >
                    {index + 1}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{person.name}</p>
                    <span className="text-sm font-bold tabular-nums text-primary">
                      {person.progressPct}%
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {person.leads} leads · {person.convertedLeads} converted
                  </p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-foreground/80 transition-all duration-700"
                      style={{ width: `${person.progressPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {superAdmin ? (
        <Link
          href="/employees"
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-xs font-semibold text-primary transition hover:border-primary/30 hover:bg-primary/5"
        >
          View all salespeople
        </Link>
      ) : null}
    </SectionCard>
  );
});
