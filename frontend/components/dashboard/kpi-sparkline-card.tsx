"use client";

import Link from "next/link";
import { memo } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { MiniSparkline } from "@/components/dashboard/mini-sparkline";

type KpiSparklineCardProps = {
  label: string;
  value: string | number;
  trendPct?: number | null;
  trendLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg?: string;
  iconColor?: string;
  sparkData?: { v: number }[];
  sparkColor?: string;
  accentBorder?: string;
  loading?: boolean;
  href?: string;
};

export const KpiSparklineCard = memo(function KpiSparklineCard({
  label,
  value,
  trendPct,
  trendLabel,
  icon: Icon,
  iconBg = "bg-muted",
  iconColor = "text-muted-foreground",
  sparkData,
  sparkColor = "#71717a",
  accentBorder,
  loading,
  href,
}: KpiSparklineCardProps) {
  const positive = (trendPct ?? 0) >= 0;

  if (loading) {
    return (
      <div className="flex animate-pulse items-center gap-3 rounded-xl border border-border/60 bg-card p-3">
        <div className="h-8 w-8 shrink-0 rounded-lg bg-muted" />
        <div className="flex-1 space-y-1.5">
          <div className="h-2.5 w-16 rounded bg-muted" />
          <div className="h-5 w-12 rounded bg-muted" />
        </div>
      </div>
    );
  }

  const content = (
    <>
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", iconBg)}>
        <Icon className={cn("h-4 w-4", iconColor)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <div className="flex items-baseline gap-1.5">
          <p className="text-lg font-bold leading-tight tracking-tight text-foreground">{value}</p>
          {trendPct != null ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-[10px] font-semibold",
                positive ? "text-emerald-600" : "text-rose-600",
              )}
            >
              {positive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
              {positive ? "+" : ""}
              {trendPct.toFixed(0)}%
            </span>
          ) : null}
        </div>
        {trendLabel ? (
          <p className="truncate text-[10px] text-muted-foreground">{trendLabel}</p>
        ) : null}
      </div>
      <div className="hidden h-7 w-12 shrink-0 opacity-70 sm:block">
        <MiniSparkline data={sparkData} color={sparkColor} />
      </div>
    </>
  );

  const className = cn(
    "group flex items-center gap-2.5 rounded-lg border bg-card p-3 shadow-sm transition",
    accentBorder ?? "border-border hover:border-foreground/15",
    href && !accentBorder && "hover:bg-muted/30",
    href && accentBorder && "hover:bg-muted/20",
  );

  if (href) {
    return (
      <Link href={href} className={className} style={{ boxShadow: "var(--card-shadow)" }}>
        {content}
      </Link>
    );
  }

  return (
    <div className={className} style={{ boxShadow: "var(--card-shadow)" }}>
      {content}
    </div>
  );
});
