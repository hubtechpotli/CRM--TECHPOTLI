"use client";

import Link from "next/link";
import { SectionCard } from "@/components/dashboard/section-card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { isSuperAdmin } from "@/lib/roles";
import { useAuthStore } from "@/store/auth-store";

type Salesperson = {
  id: string;
  name: string;
  leads: number;
  convertedLeads: number;
  progressPct: number;
};

export function TopSalespeople({
  people,
  loading,
}: {
  people: Salesperson[];
  loading?: boolean;
}) {
  const superAdmin = isSuperAdmin(useAuthStore((s) => s.user?.role));

  return (
    <SectionCard title="Top Salespeople">
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : people.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No sales data yet.</p>
      ) : (
        <ul className="space-y-4">
          {people.slice(0, 3).map((person) => (
            <li key={person.id}>
              <div className="flex items-center gap-3">
                <UserAvatar name={person.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{person.name}</p>
                    <span className="text-xs font-semibold text-primary">{person.progressPct}%</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {person.leads} leads · {person.convertedLeads} converted
                  </p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all"
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
          className="mt-4 flex w-full items-center justify-center rounded-xl border border-border py-2 text-xs font-medium text-primary transition hover:bg-primary/5"
        >
          View All Salespeople
        </Link>
      ) : null}
    </SectionCard>
  );
}
