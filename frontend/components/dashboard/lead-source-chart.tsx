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
      subtitle={topSource ? `Top: ${topSource}` : "By channel"}
      icon={PieChartIcon}
      compact
      noPadding
    >
      <div className="p-3 pt-1">
        {loading ? (
          <div className="h-36 animate-pulse rounded-lg bg-muted/60" />
        ) : chartData.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">No lead source data yet.</p>
        ) : (
          <div className="flex items-center gap-3">
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
            <ul className="min-w-0 flex-1 space-y-1.5">
              {chartData.map((item, i) => {
                const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                return (
                  <li key={item.name}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-2 font-medium">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: COLORS[i % COLORS.length] }}
                        />
                        {item.name}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
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
