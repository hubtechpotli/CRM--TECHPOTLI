"use client";

import Link from "next/link";
import { UserPlus, Phone, FileText } from "lucide-react";
import { SectionCard } from "@/components/dashboard/section-card";
import { activityLink, formatLabel, timeAgo } from "@/lib/format";

type ActivityItem = {
  id: string;
  action: string;
  module: string;
  recordId?: string | null;
  createdAt: string;
  user?: { name: string; email: string } | null;
};

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  lead: UserPlus,
  customer: UserPlus,
  invoice: FileText,
  project: FileText,
};

export function ActivitySidebar({
  items,
  loading,
}: {
  items: ActivityItem[];
  loading?: boolean;
}) {
  return (
    <SectionCard title="Recent Activities" action="View all" actionHref="/activity">
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No recent activity.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => {
            const Icon = MODULE_ICONS[item.module] ?? Phone;
            const link = activityLink(item.module, item.recordId);
            const actor = item.user?.name ?? "System";
            return (
              <li key={item.id} className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-snug">
                    <span className="font-semibold">{actor}</span>{" "}
                    <span className="text-muted-foreground">
                      {formatLabel(item.action).toLowerCase()}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{timeAgo(item.createdAt)}</p>
                  {link ? (
                    <Link href={link} className="mt-1 inline-block text-[10px] font-medium text-primary hover:underline">
                      View record
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
