"use client";

import Link from "next/link";
import { memo } from "react";
import { Activity } from "lucide-react";
import { SectionCard } from "@/components/dashboard/section-card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { activityLink, formatLabel, timeAgo } from "@/lib/format";
import { actionBadgeFor, moduleColorFor } from "@/lib/activity-ui";
import { cn } from "@/lib/utils";

type ActivityItem = {
  id: string;
  action: string;
  module: string;
  recordId?: string | null;
  createdAt: string;
  user?: { name: string; email: string } | null;
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
        <ul className="relative space-y-0 pr-1">
          <div className="absolute bottom-1 left-4 top-1 w-px bg-border" aria-hidden />
          {items.map((item, index) => {
            const link = activityLink(item.module, item.recordId);
            const actor = item.user?.name ?? "System";
            const modColor = moduleColorFor(item.module);
            const actBadge = actionBadgeFor(item.action);

            return (
              <li key={item.id} className="relative flex items-start gap-2.5 pb-3 last:pb-0">
                <div className="relative z-10 shrink-0 pt-0.5">
                  <UserAvatar name={actor} size="sm" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 text-xs leading-snug">
                      <span className="font-semibold text-foreground">{actor}</span>{" "}
                      <span className="text-muted-foreground">{actBadge.label.toLowerCase()}</span>{" "}
                      <span className={cn("font-medium", modColor.text)}>{formatLabel(item.module)}</span>
                    </p>
                    <div className="flex shrink-0 flex-wrap items-center gap-1">
                      {index === 0 ? (
                        <span className="shrink-0 rounded-full bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                          New
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          "rounded-full border px-1.5 py-0.5 text-[9px] font-semibold",
                          modColor.light,
                          modColor.text,
                          modColor.border,
                        )}
                      >
                        {formatLabel(item.module)}
                      </span>
                    </div>
                  </div>
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
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
});
