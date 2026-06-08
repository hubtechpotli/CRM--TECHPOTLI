"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function KpiSparklineCard({
  label,
  value,
  trendPct,
  trendLabel,
  icon: Icon,
  iconBg = "bg-primary/10",
  iconColor = "text-primary",
  sparkData,
  sparkColor = "#6366f1",
  loading,
}: {
  label: string;
  value: string | number;
  trendPct?: number | null;
  trendLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg?: string;
  iconColor?: string;
  sparkData?: { v: number }[];
  sparkColor?: string;
  loading?: boolean;
}) {
  const positive = (trendPct ?? 0) >= 0;
  const data = sparkData?.length ? sparkData : [{ v: 0 }, { v: 0 }];

  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl border border-border/60 bg-card p-5">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="mt-3 h-8 w-16 rounded bg-muted" />
        <div className="mt-4 h-12 rounded bg-muted" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
      style={{ boxShadow: "var(--card-shadow)" }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
          {trendPct != null ? (
            <div className="mt-1 flex items-center gap-1">
              {positive ? (
                <TrendingUp className="h-3 w-3 text-emerald-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-rose-500" />
              )}
              <span
                className={cn(
                  "text-[11px] font-medium",
                  positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                )}
              >
                {positive ? "+" : ""}
                {trendPct.toFixed(1)}%
              </span>
              {trendLabel ? (
                <span className="text-[11px] text-muted-foreground">{trendLabel}</span>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", iconBg)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
      <div className="mt-3 h-12 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={sparkColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={sparkColor}
              strokeWidth={2}
              fill={`url(#spark-${label})`}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
