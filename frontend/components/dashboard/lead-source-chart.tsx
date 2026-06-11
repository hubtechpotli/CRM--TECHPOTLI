"use client";

import { memo, useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";
import { SectionCard } from "@/components/dashboard/section-card";
import { formatLabel } from "@/lib/format";

const COLORS = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#64748b"];

type SourceRow = { source: string; count: number };

export const LeadSourceChart = memo(function LeadSourceChart({
  data,
  total,
  loading,
}: {
  data: SourceRow[];
  total: number;
  loading?: boolean;
}) {
  const chartData = useMemo(
    () =>
      [...data]
        .sort((a, b) => b.count - a.count)
        .map((d) => ({
          name: formatLabel(d.source),
          value: d.count,
        })),
    [data],
  );

  const topSource = chartData[0]?.name;

  return (
    <SectionCard
      title="Lead Sources"
      subtitle="By channel"
      icon={PieChartIcon}
      compact
      noPadding
    >
      <div className="space-y-3 p-3 pt-2 sm:p-4">
        {topSource ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Top source
            </span>
            <span className="inline-flex max-w-full items-center rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs font-semibold text-foreground">
              <span className="truncate">{topSource}</span>
            </span>
          </div>
        ) : null}

        {loading ? (
          <div className="h-36 animate-pulse rounded-lg bg-muted/60" />
        ) : chartData.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">No lead source data yet.</p>
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="relative h-32 w-32 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={52}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="var(--card)"
                    strokeWidth={2}
                  >
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      fontSize: 12,
                      boxShadow: "var(--card-shadow)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-xl font-bold tracking-tight">{total}</p>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Total leads
                </p>
              </div>
            </div>
            <ul className="min-w-0 w-full flex-1 space-y-2">
              {chartData.map((item, i) => {
                const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                return (
                  <li key={item.name}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                      <span className="flex min-w-0 items-center gap-2 font-medium">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: COLORS[i % COLORS.length] }}
                        />
                        <span className="truncate">{item.name}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {item.value} · {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </SectionCard>
  );
});
