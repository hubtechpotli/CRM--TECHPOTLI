import type { LucideIcon } from "lucide-react";
import {
  CircleDot,
  UserCheck,
  Phone,
  CalendarClock,
  FileText,
  Handshake,
  Trophy,
  XCircle,
  PauseCircle,
  Sparkles,
} from "lucide-react";
import { LEAD_PRIORITIES, LEAD_STATUSES } from "@/lib/types";
import { formatLabel } from "@/lib/format";

export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

export type StatusMeta = {
  label: string;
  icon: LucideIcon;
  dot: string;
  bg: string;
  border: string;
  text: string;
  columnBg: string;
  columnAccent: string;
};

export type PriorityMeta = {
  label: string;
  bg: string;
  text: string;
  border: string;
};

export const LEAD_STATUS_META: Record<LeadStatus, StatusMeta> = {
  NEW: {
    label: "New",
    icon: CircleDot,
    dot: "bg-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/25",
    text: "text-blue-700 dark:text-blue-300",
    columnBg: "bg-blue-500/5",
    columnAccent: "bg-blue-500",
  },
  ASSIGNED: {
    label: "Assigned",
    icon: UserCheck,
    dot: "bg-purple-500",
    bg: "bg-purple-500/10",
    border: "border-purple-500/25",
    text: "text-purple-700 dark:text-purple-300",
    columnBg: "bg-purple-500/5",
    columnAccent: "bg-purple-500",
  },
  CONTACTED: {
    label: "Contacted",
    icon: Phone,
    dot: "bg-cyan-500",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/25",
    text: "text-cyan-700 dark:text-cyan-300",
    columnBg: "bg-cyan-500/5",
    columnAccent: "bg-cyan-500",
  },
  FOLLOW_UP: {
    label: "Follow Up",
    icon: CalendarClock,
    dot: "bg-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/25",
    text: "text-amber-700 dark:text-amber-300",
    columnBg: "bg-amber-500/5",
    columnAccent: "bg-amber-500",
  },
  PROPOSAL_SENT: {
    label: "Proposal Sent",
    icon: FileText,
    dot: "bg-orange-500",
    bg: "bg-orange-500/10",
    border: "border-orange-500/25",
    text: "text-orange-700 dark:text-orange-300",
    columnBg: "bg-orange-500/5",
    columnAccent: "bg-orange-500",
  },
  NEGOTIATION: {
    label: "Negotiation",
    icon: Handshake,
    dot: "bg-pink-500",
    bg: "bg-pink-500/10",
    border: "border-pink-500/25",
    text: "text-pink-700 dark:text-pink-300",
    columnBg: "bg-pink-500/5",
    columnAccent: "bg-pink-500",
  },
  WON: {
    label: "Won",
    icon: Trophy,
    dot: "bg-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/25",
    text: "text-emerald-700 dark:text-emerald-300",
    columnBg: "bg-emerald-500/5",
    columnAccent: "bg-emerald-500",
  },
  LOST: {
    label: "Lost",
    icon: XCircle,
    dot: "bg-rose-500",
    bg: "bg-rose-500/10",
    border: "border-rose-500/25",
    text: "text-rose-700 dark:text-rose-300",
    columnBg: "bg-rose-500/5",
    columnAccent: "bg-rose-500",
  },
  ON_HOLD: {
    label: "On Hold",
    icon: PauseCircle,
    dot: "bg-slate-500",
    bg: "bg-slate-500/10",
    border: "border-slate-500/25",
    text: "text-slate-700 dark:text-slate-300",
    columnBg: "bg-slate-500/5",
    columnAccent: "bg-slate-500",
  },
};

export const LEAD_PRIORITY_META: Record<LeadPriority, PriorityMeta> = {
  LOW: {
    label: "Low",
    bg: "bg-slate-500/10",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-500/25",
  },
  MEDIUM: {
    label: "Medium",
    bg: "bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-500/25",
  },
  HIGH: {
    label: "High",
    bg: "bg-orange-500/10",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-500/25",
  },
  HOT: {
    label: "Hot",
    bg: "bg-red-500/10",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-500/25",
  },
};

export const PIPELINE_STATUSES: LeadStatus[] = [
  "NEW",
  "ASSIGNED",
  "CONTACTED",
  "FOLLOW_UP",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
];

export function getStatusMeta(status: string): StatusMeta {
  return LEAD_STATUS_META[status as LeadStatus] ?? {
    label: formatLabel(status),
    icon: Sparkles,
    dot: "bg-primary",
    bg: "bg-primary/10",
    border: "border-primary/25",
    text: "text-primary",
    columnBg: "bg-primary/5",
    columnAccent: "bg-primary",
  };
}

export function getPriorityMeta(priority: string): PriorityMeta {
  return LEAD_PRIORITY_META[priority as LeadPriority] ?? {
    label: formatLabel(priority),
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
  };
}

export function companyInitial(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

export function isFollowUpOverdue(date: unknown): boolean {
  if (!date) return false;
  const d = new Date(String(date));
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

export function isFollowUpToday(date: unknown): boolean {
  if (!date) return false;
  const d = new Date(String(date));
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

export function computeKanbanStats(data: Record<string, Record<string, unknown>[]> | undefined) {
  const allLeads = data ? Object.values(data).flat() : [];
  const active = allLeads.filter(
    (l) => l.status !== "WON" && l.status !== "LOST",
  );
  const overdue = active.filter((l) => isFollowUpOverdue(l.followUpDate));
  const dueToday = active.filter((l) => isFollowUpToday(l.followUpDate));
  const hot = active.filter((l) => l.priority === "HOT");
  return {
    total: active.length,
    overdue: overdue.length,
    dueToday: dueToday.length,
    hot: hot.length,
    byStatus: Object.fromEntries(
      LEAD_STATUSES.map((s) => [s, (data?.[s] ?? []).length]),
    ),
  };
}
