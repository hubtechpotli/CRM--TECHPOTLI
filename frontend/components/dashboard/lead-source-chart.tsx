"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { SectionCard } from "@/components/dashboard/section-card";
import { formatLabel } from "@/lib/format";

const COLORS = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#64748b"];

type SourceRow = { source: string; count: number };

export function LeadSourceChart({
  data,
  total,
  loading,
}: {
  data: SourceRow[];
  total: number;
  loading?: boolean;
}) {
  const chartData = data.map((d) => ({
    name: formatLabel(d.source),
    value: d.count,
  }));

  return (
    <SectionCard title="Lead Source" noPadding>
      <div className="p-5 pt-2">
        {loading ? (
          <div className="h-56 animate-pulse rounded-xl bg-muted" />
        ) : chartData.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No lead source data yet.</p>
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="relative h-52 w-52 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
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
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-[10px] text-muted-foreground">Total</p>
              </div>
            </div>
            <ul className="flex-1 space-y-2 text-xs">
              {chartData.map((item, i) => (
                <li key={item.name} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    {item.name}
                  </span>
                  <span className="font-medium text-muted-foreground">
                    {total > 0 ? Math.round((item.value / total) * 100) : 0}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
