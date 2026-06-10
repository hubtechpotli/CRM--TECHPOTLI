"use client";

import Link from "next/link";
import { Calendar, LayoutDashboard, Target, UserPlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { FEATURE } from "@/lib/feature-colors";

type DashboardHeroBannerProps = {
  userName?: string;
  totalLeads?: number;
  convertedLeads?: number;
  followUpsDue?: number;
  loading?: boolean;
};

const QUICK_ACTIONS = [
  { href: "/leads?new=1", label: "New Lead", icon: UserPlus, color: FEATURE.leads },
  { href: "/leads", label: "Follow-ups", icon: Calendar, color: FEATURE.followups },
  { href: "/customers", label: "Customers", icon: Users, color: FEATURE.customers },
  { href: "/team-updates", label: "Updates", icon: LayoutDashboard, color: FEATURE.teamUpdates },
] as const;

export function DashboardHeroBanner({
  userName,
  totalLeads = 0,
  convertedLeads = 0,
  followUpsDue = 0,
  loading,
}: DashboardHeroBannerProps) {
  const conversionRate =
    totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;
  const firstName = userName?.split(" ")[0];

  if (loading) {
    return (
      <div className="flex animate-pulse items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-7 w-7 rounded-md bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          {firstName ? (
            <>
              Hi, <span className={FEATURE.leads.text}>{firstName}</span>
            </>
          ) : (
            "Dashboard"
          )}
        </h2>
        <span className="hidden h-3.5 w-px bg-border sm:block" aria-hidden />
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold",
            FEATURE.converted.light,
            FEATURE.converted.border,
            FEATURE.converted.text,
          )}
        >
          <Target className="h-3 w-3" />
          {conversionRate}% conversion
        </span>
        {followUpsDue > 0 ? (
          <Link
            href="/leads"
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold transition hover:brightness-95",
              FEATURE.followups.light,
              FEATURE.followups.border,
              FEATURE.followups.text,
            )}
          >
            <Calendar className="h-3 w-3" />
            {followUpsDue} due today
          </Link>
        ) : (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium",
              FEATURE.converted.light,
              FEATURE.converted.border,
              FEATURE.converted.text,
            )}
          >
            Follow-ups on track
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {QUICK_ACTIONS.map(({ href, label, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            title={label}
            className={cn(
              "group flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-[10px] font-semibold text-foreground transition hover:shadow-sm",
              color.border,
              color.hoverBg,
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-md text-white shadow-sm",
                color.solid,
              )}
            >
              <Icon className="h-3 w-3" />
            </span>
            <span className="hidden md:inline">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
