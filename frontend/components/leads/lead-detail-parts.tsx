"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Mail,
  MessageSquare,
  Phone,
  User,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime, formatLabel } from "@/lib/format";
import { isFollowUpOverdue } from "@/lib/lead-ui";
import { LeadStatusBadge } from "@/components/leads/lead-badges";

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  CALL: Phone,
  EMAIL: Mail,
  WHATSAPP: MessageSquare,
  MEETING: Video,
  NOTE: MessageSquare,
};

export function DetailBackLink() {
  return (
    <Link
      href="/leads"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-primary"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to leads
    </Link>
  );
}

export function InfoRow({
  icon: Icon,
  label,
  value,
  href,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
  highlight?: boolean;
}) {
  const content = href ? (
    <a href={href} className="font-medium text-primary hover:underline">
      {value}
    </a>
  ) : (
    <span className={cn("font-medium", highlight && "text-amber-600 dark:text-amber-400")}>{value}</span>
  );

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/40 bg-muted/20 px-3 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm">{content}</p>
      </div>
    </div>
  );
}

export function ActivityTimeline({
  activities,
  onLogActivity,
}: {
  activities: Array<Record<string, unknown> & { user?: { name?: string } }>;
  onLogActivity?: () => void;
}) {
  if (!activities.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Phone className="h-5 w-5 text-primary" />
        </div>
        <p className="text-sm font-medium">No activities yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Log your first call after contacting this lead.</p>
        {onLogActivity ? (
          <button
            type="button"
            onClick={onLogActivity}
            className="mt-4 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            Log activity
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <ul className="relative max-h-[420px] space-y-0 overflow-y-auto pl-1">
      {activities.map((a, i) => {
        const type = String(a.type ?? "NOTE");
        const Icon = ACTIVITY_ICONS[type] ?? MessageSquare;
        const isLast = i === activities.length - 1;

        return (
          <li key={String(a.id)} className="relative flex gap-3 pb-6">
            {!isLast ? (
              <span className="absolute left-[15px] top-8 h-[calc(100%-16px)] w-px bg-border" />
            ) : null}
            <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10">
              <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold">{formatLabel(type)}</span>
                <span className="text-[11px] text-muted-foreground">
                  {formatDateTime(a.createdAt)}
                </span>
              </div>
              {a.contactStatus ? (
                <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                  {formatLabel(String(a.contactStatus))}
                </span>
              ) : null}
              {a.outcome ? (
                <p className="mt-1.5 text-xs font-medium text-primary">{String(a.outcome)}</p>
              ) : null}
              {a.notes ? <p className="mt-1 text-sm text-foreground/90">{String(a.notes)}</p> : null}
              {a.user?.name ? (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  <User className="mr-1 inline h-3 w-3" />
                  {a.user.name}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function StatusHistoryTimeline({
  history,
}: {
  history: Array<Record<string, unknown> & { changedBy?: { name?: string } }>;
}) {
  if (!history.length) {
    return <p className="py-4 text-sm text-muted-foreground">No status changes yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {history.map((h) => {
        return (
          <li
            key={String(h.id)}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-2.5 text-sm"
          >
            <span className="text-muted-foreground">{formatLabel(String(h.fromStatus ?? ""))}</span>
            <span className="text-muted-foreground">→</span>
            <LeadStatusBadge status={String(h.toStatus ?? "")} size="sm" />
            {h.reason ? <span className="text-xs text-muted-foreground">({String(h.reason)})</span> : null}
            <span className="ml-auto text-[11px] text-muted-foreground">
              {h.changedBy?.name ? `${h.changedBy.name} · ` : ""}
              {formatDateTime(h.createdAt)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function QuickFacts({
  phone,
  email,
  budget,
  followUpDate,
}: {
  phone?: string;
  email?: string;
  budget?: unknown;
  followUpDate?: unknown;
}) {
  const overdue = isFollowUpOverdue(followUpDate);

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {phone ? (
        <InfoRow icon={Phone} label="Phone" value={phone} href={`tel:${phone}`} />
      ) : null}
      {email ? (
        <InfoRow icon={Mail} label="Email" value={email} href={`mailto:${email}`} />
      ) : null}
      {budget != null ? (
        <InfoRow icon={DollarSign} label="Budget" value={`₹${budget}`} />
      ) : null}
      {followUpDate ? (
        <InfoRow
          icon={Calendar}
          label="Follow-up"
          value={`${formatDate(followUpDate)}${overdue ? " · Overdue" : ""}`}
          highlight={overdue}
        />
      ) : null}
    </div>
  );
}
