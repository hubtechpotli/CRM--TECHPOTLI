"use client";

import { memo, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";
import { SectionCard } from "@/components/dashboard/section-card";
import { formatDateShort } from "@/lib/format";

type Point = { date: string; count: number };

export const LeadsOverviewChart = memo(function LeadsOverviewChart({
  data,
  loading,
}: {
  data: Point[];
  loading?: boolean;
}) {
  const { formatted, total, peak } = useMemo(() => {
    const formatted = data.map((d) => ({
      ...d,
      label: formatDateShort(d.date),
    }));
    const total = data.reduce((sum, d) => sum + d.count, 0);
    const peak = data.reduce((max, d) => Math.max(max, d.count), 0);
    return { formatted, total, peak };
  }, [data]);

  return (
    <SectionCard
      title="Leads Overview"
      subtitle="Last 30 days"
      icon={TrendingUp}
      compact
      noPadding
    >
      <div className="px-3 pb-3 pt-1">
        {!loading && data.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2 text-[10px]">
            <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 font-medium text-muted-foreground">
              {total} total leads
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
              Peak: {peak}/day
            </span>
          </div>
        ) : null}
        {loading ? (
          <div className="h-36 animate-pulse rounded-lg bg-muted/60" />
        ) : formatted.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">No lead trend data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={formatted} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="leadsArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  fontSize: 12,
                  boxShadow: "var(--card-shadow)",
                }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#6366f1"
                strokeWidth={2.5}
                fill="url(#leadsArea)"
                dot={false}
                activeDot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </SectionCard>
  );
});
