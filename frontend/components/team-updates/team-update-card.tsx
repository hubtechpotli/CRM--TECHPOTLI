"use client";

import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Loader2,
  PlayCircle,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime, formatLabel } from "@/lib/format";
import type { GlobalWorkItem } from "@/lib/team-updates";
import { AssigneeHighlight, MentionText } from "@/components/team-updates/mention-badge";
import { UserAvatar } from "@/components/ui/user-avatar";

function statusMeta(status: string) {
  switch (status) {
    case "IN_PROGRESS":
      return {
        label: "In progress",
        className: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300",
        stripe: "bg-amber-400",
      };
    case "COMPLETED":
      return {
        label: "Completed",
        className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
        stripe: "bg-emerald-500",
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        className: "bg-slate-500/10 text-slate-600 border-slate-500/30",
        stripe: "bg-slate-400",
      };
    default:
      return {
        label: "Open",
        className: "bg-primary/10 text-primary border-primary/30",
        stripe: "bg-foreground/40",
      };
  }
}

export function TeamUpdateCard({
  item,
  customerId,
  currentUserId,
  mentionUsers,
  expanded,
  onToggleExpand,
  updateText,
  onUpdateTextChange,
  onStart,
  onComplete,
  onAddUpdate,
  updatesSlot,
  updatePending,
  statusPending,
}: {
  item: GlobalWorkItem;
  customerId: string;
  currentUserId?: string;
  mentionUsers: Array<{ id: string; name: string }>;
  expanded: boolean;
  onToggleExpand: () => void;
  updateText: string;
  onUpdateTextChange: (v: string) => void;
  onStart: () => void;
  onComplete: () => void;
  onAddUpdate: () => void;
  updatesSlot?: React.ReactNode;
  updatePending?: boolean;
  statusPending?: boolean;
}) {
  const status = String(item.status ?? "OPEN");
  const meta = statusMeta(status);
  const isDone = status === "COMPLETED" || status === "CANCELLED";
  const canManage = !isDone;
  const updateCount =
    (item as GlobalWorkItem & { _count?: { updates: number } })._count?.updates ??
    (item.updates ?? []).length;

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card shadow-sm transition",
        isDone ? "border-emerald-200/50 opacity-90 dark:border-emerald-500/20" : "border-border hover:shadow-md",
      )}
      style={{ boxShadow: "var(--card-shadow)" }}
    >
      <div className={cn("absolute inset-y-0 left-0 w-1", meta.stripe)} aria-hidden />

      <div className="p-4 pl-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Link
            href={`/customers/${customerId}?tab=teamWork`}
            className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[10px] font-semibold text-foreground transition hover:bg-primary/10 hover:text-primary"
          >
            <Building2 className="h-3 w-3" />
            {item.customer?.companyName ?? "Customer"}
            <ExternalLink className="h-2.5 w-2.5" />
          </Link>
          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", meta.className)}>
            {meta.label}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            {formatLabel(String(item.category ?? "GENERAL"))}
          </span>
          {status === "COMPLETED" ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
              <CheckCircle2 className="h-3 w-3" />
              Done
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className={cn("font-semibold leading-snug", isDone && "text-muted-foreground line-through decoration-emerald-500/40")}>
              {item.title}
            </h3>
            {item.description ? (
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                <MentionText text={String(item.description)} users={mentionUsers} />
              </p>
            ) : null}
          </div>
          <div className="shrink-0 text-right text-[10px] text-muted-foreground">
            <p>{formatDateTime(item.createdAt)}</p>
            {item.dueDate ? (
              <p className="mt-0.5 inline-flex items-center gap-0.5">
                <Clock className="h-3 w-3" />
                Due {formatDate(item.dueDate)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserAvatar name={item.createdBy?.name ?? "?"} size="sm" />
            <span>
              <span className="font-medium text-foreground">{item.createdBy?.name ?? "—"}</span> posted
            </span>
          </div>
          {item.project?.name ? (
            <Link href={`/projects/${item.project.id}`} className="text-[10px] text-primary hover:underline">
              {item.project.name}
            </Link>
          ) : null}
        </div>

        {item.assignedTo?.name ? (
          <AssigneeHighlight
            name={item.assignedTo.name}
            userId={item.assignedTo.id}
            currentUserId={currentUserId}
            className="mt-3 rounded-lg border border-border bg-muted/30 px-3 py-2"
          />
        ) : (
          <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
            <Users className="h-3 w-3" />
            Visible to entire team
          </p>
        )}

        {canManage ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {status === "OPEN" ? (
              <button
                type="button"
                disabled={statusPending}
                onClick={onStart}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-300/60 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50 dark:bg-amber-950/30 dark:text-amber-300"
              >
                {statusPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlayCircle className="h-3 w-3" />}
                Start work
              </button>
            ) : null}
            <button
              type="button"
              disabled={statusPending}
              onClick={onComplete}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {statusPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              Mark complete
            </button>
          </div>
        ) : status === "COMPLETED" ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200/60 bg-emerald-50/60 px-3 py-2 dark:border-emerald-500/20 dark:bg-emerald-950/20">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Task completed — great work!</span>
          </div>
        ) : null}

        {updateCount > 0 ? (
          <button
            type="button"
            onClick={onToggleExpand}
            className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {updateCount} reply{updateCount === 1 ? "" : "ies"}
          </button>
        ) : null}

        {expanded ? updatesSlot : null}

        {canManage ? (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={updateText}
              onChange={(e) => onUpdateTextChange(e.target.value)}
              placeholder="Reply or add progress… use @Name to mention"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
            <button
              type="button"
              disabled={!updateText.trim() || updatePending}
              onClick={onAddUpdate}
              className="rounded-lg bg-primary px-3 py-1.5 text-[10px] font-semibold text-primary-foreground disabled:opacity-50"
            >
              {updatePending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Reply"}
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
