"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { GlassCard } from "@/components/ui/glass-card";

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type RevenueSummary = {
  oneTimeRevenue: number;
  monthlyRevenue: number;
  annualProjection: number;
  breakdown: Array<{ serviceType: string; oneTime: number; monthly: number }>;
};

export function CustomerRevenuePanel({ customerId }: { customerId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["customer-revenue", customerId],
    queryFn: async () => {
      const res = await api.get<RevenueSummary>(`/customers/${customerId}/revenue-summary`);
      return res.data;
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading revenue…</p>;
  if (!data) return <p className="text-sm text-muted-foreground">No revenue data</p>;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <GlassCard>
          <p className="text-xs text-muted-foreground">One-Time Revenue</p>
          <p className="mt-1 text-2xl font-semibold">₹{data.oneTimeRevenue.toLocaleString()}</p>
          <p className="mt-1 text-xs text-muted-foreground">Website, design, custom dev</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs text-muted-foreground">Monthly Recurring Revenue</p>
          <p className="mt-1 text-2xl font-semibold">₹{data.monthlyRevenue.toLocaleString()}</p>
          <p className="mt-1 text-xs text-muted-foreground">SEO, ads, social, subscriptions</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs text-muted-foreground">Annual Projection</p>
          <p className="mt-1 text-2xl font-semibold">₹{data.annualProjection.toLocaleString()}</p>
          <p className="mt-1 text-xs text-muted-foreground">MRR × 12 (auto-calculated)</p>
        </GlassCard>
      </div>

      <GlassCard>
        <h3 className="mb-3 text-sm font-semibold">Revenue by service</h3>
        {data.breakdown.length ? (
          <ul className="space-y-2 text-sm">
            {data.breakdown.map((b) => (
              <li key={b.serviceType} className="flex justify-between border-b border-border/40 pb-2">
                <span>{formatLabel(b.serviceType)}</span>
                <span>
                  {b.oneTime > 0 ? `₹${b.oneTime.toLocaleString()} one-time` : ""}
                  {b.oneTime > 0 && b.monthly > 0 ? " · " : ""}
                  {b.monthly > 0 ? `₹${b.monthly.toLocaleString()}/mo` : ""}
                  {!b.oneTime && !b.monthly ? "—" : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Add services to see revenue breakdown.</p>
        )}
      </GlassCard>
    </div>
  );
}
