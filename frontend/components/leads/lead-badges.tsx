import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPriorityMeta, getStatusMeta } from "@/lib/lead-ui";

export function LeadStatusBadge({
  status,
  size = "sm",
  showIcon = false,
}: {
  status: string;
  size?: "sm" | "md";
  showIcon?: boolean;
}) {
  const meta = getStatusMeta(status);
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        meta.bg,
        meta.border,
        meta.text,
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
      )}
    >
      {showIcon ? <Icon className="h-3 w-3 shrink-0" /> : <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dot)} />}
      {meta.label}
    </span>
  );
}

export function LeadPriorityBadge({ priority }: { priority: string }) {
  const meta = getPriorityMeta(priority);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        meta.bg,
        meta.border,
        meta.text,
      )}
    >
      {meta.label}
    </span>
  );
}

export function LeadConversionBadge({
  status,
  convertedToCustomerId,
}: {
  status?: string;
  convertedToCustomerId?: string;
}) {
  if (status === "WON" || convertedToCustomerId) {
    return convertedToCustomerId ? (
      <Link
        href={`/customers/${convertedToCustomerId}`}
        className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 hover:underline dark:text-emerald-300"
      >
        Converted
      </Link>
    ) : (
      <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
        Converted
      </span>
    );
  }
  if (status === "LOST") {
    return (
      <span className="inline-flex items-center rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:text-rose-300">
        Lost
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
      Active
    </span>
  );
}

export function LeadAiScoreBadge({
  score,
  reason,
}: {
  score: number;
  reason?: string | null;
}) {
  const tier =
    score >= 70
      ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/25 dark:text-emerald-400"
      : score >= 40
        ? "bg-amber-500/15 text-amber-700 border-amber-500/25 dark:text-amber-400"
        : "bg-muted text-muted-foreground border-border";

  return (
    <span
      title={reason ? String(reason) : "AI score"}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tier,
      )}
    >
      <Sparkles className="h-3 w-3" />
      {score}
    </span>
  );
}

export function CompanyAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const initial = name.trim() ? name.trim()[0].toUpperCase() : "?";
  return (
    <div
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-700 text-sm font-semibold text-white",
        className,
      )}
    >
      {initial}
    </div>
  );
}
