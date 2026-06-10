"use client";

import Link from "next/link";
import { memo } from "react";
import { Activity, FileText, Phone, UserPlus } from "lucide-react";
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

const MODULE_COLORS: Record<string, string> = {
  lead: "bg-muted text-foreground",
  customer: "bg-muted text-foreground",
  invoice: "bg-muted text-foreground",
  project: "bg-muted text-foreground",
};

export const ActivitySidebar = memo(function ActivitySidebar({
  items,
  loading,
}: {
  items: ActivityItem[];
  loading?: boolean;
}) {
  return (
    <SectionCard
      title="Recent Activity"
      subtitle="Latest CRM actions"
      icon={Activity}
      compact
      action="View all"
      actionHref="/activity"
    >
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
                <div className="h-2 w-16 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted-foreground">No recent activity.</p>
      ) : (
        <ul className="relative space-y-0">
          <div className="absolute bottom-1 left-3.5 top-1 w-px bg-border" aria-hidden />
          {items.map((item, index) => {
            const Icon = MODULE_ICONS[item.module] ?? Phone;
            const colorClass = MODULE_COLORS[item.module] ?? "bg-primary/10 text-primary";
            const link = activityLink(item.module, item.recordId);
            const actor = item.user?.name ?? "System";

            return (
              <li key={item.id} className="relative flex gap-2 pb-2.5 last:pb-0">
                <div
                  className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-2 ring-card ${colorClass}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-xs leading-snug">
                    <span className="font-semibold text-foreground">{actor}</span>{" "}
                    <span className="text-muted-foreground">
                      {formatLabel(item.action).toLowerCase()}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                    {timeAgo(item.createdAt)}
                  </p>
                  {link ? (
                    <Link
                      href={link}
                      className="mt-1.5 inline-flex items-center text-[10px] font-semibold text-primary transition hover:underline"
                    >
                      View record →
                    </Link>
                  ) : null}
                </div>
                {index === 0 ? (
                  <span className="absolute -right-1 top-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                    New
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
});
