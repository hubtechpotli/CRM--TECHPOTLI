"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Calendar, IndianRupee, Receipt, Trophy, UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { isAdmin } from "@/lib/roles";
import { useAuthStore } from "@/store/auth-store";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { KpiSparklineCard } from "@/components/dashboard/kpi-sparkline-card";
import { LeadsOverviewChart } from "@/components/dashboard/leads-overview-chart";
import { LeadSourceChart } from "@/components/dashboard/lead-source-chart";
import { RecentLeadsPanel } from "@/components/dashboard/recent-leads-panel";
import { ActivitySidebar } from "@/components/dashboard/activity-sidebar";
import { TopSalespeople } from "@/components/dashboard/top-salespeople";
import { TeamUpdatesPanel } from "@/components/dashboard/team-updates-panel";

type CrmInsights = {
  kpis: {
    totalLeads: number;
    convertedLeads: number;
    revenue: number;
    followUpsDueToday: number;
    trends: {
      totalLeadsPct: number;
      convertedPct: number;
      revenuePct: number;
      followUpsPct: number;
    };
  };
  leadsTrend: { date: string; count: number }[];
  sparklines: {
    totalLeads: { v: number }[];
    converted: { v: number }[];
    revenue: { v: number }[];
    followUps: { v: number }[];
  };
  leadsBySource: { source: string; count: number }[];
  recentLeads: Array<Record<string, unknown>>;
  topSalespeople: Array<{
    id: string;
    name: string;
    leads: number;
    convertedLeads: number;
    progressPct: number;
  }>;
};

type ActivityItem = {
  id: string;
  action: string;
  module: string;
  recordId?: string | null;
  createdAt: string;
  user?: { name: string; email: string } | null;
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { authReady } = useAuthReady();
  const adminView = isAdmin(user?.role);
  const [statusFilter, setStatusFilter] = useState("");

  const { data: insights, isLoading } = useQuery({
    queryKey: ["crm-insights"],
    queryFn: async () => {
      const res = await api.get<CrmInsights>("/reports/crm-insights");
      return res.data;
    },
    enabled: authReady,
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ["activity-log-recent"],
    queryFn: async () => {
      const res = await api.get<{ items: ActivityItem[] }>("/activity-log?take=6");
      return res.data;
    },
    enabled: authReady,
  });

  const { data: collectionsSummary, isLoading: collectionsLoading } = useQuery({
    queryKey: ["payments-summary"],
    queryFn: async () => {
      const res = await api.get<{
        today: { count: number; amount: number };
        month: { count: number; amount: number };
      }>("/payments/summary");
      return res.data;
    },
    enabled: authReady && adminView,
  });

  const filteredLeads = useMemo(() => {
    const leads = insights?.recentLeads ?? [];
    if (!statusFilter) return leads;
    return leads.filter((l) => l.status === statusFilter);
  }, [insights?.recentLeads, statusFilter]);

  const formatRevenue = (n: number) => {
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
    return `₹${n.toLocaleString("en-IN")}`;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiSparklineCard
          label="Total Leads"
          value={insights?.kpis.totalLeads ?? "—"}
          trendPct={insights?.kpis.trends.totalLeadsPct}
          trendLabel="from last month"
          icon={UserPlus}
          iconBg="bg-indigo-500/10"
          iconColor="text-indigo-600"
          sparkData={insights?.sparklines.totalLeads}
          loading={isLoading}
        />
        <KpiSparklineCard
          label="Converted Leads"
          value={insights?.kpis.convertedLeads ?? "—"}
          trendPct={insights?.kpis.trends.convertedPct}
          trendLabel="from last month"
          icon={Trophy}
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-600"
          sparkColor="#10b981"
          sparkData={insights?.sparklines.converted}
          loading={isLoading}
        />
        <KpiSparklineCard
          label="Revenue Generated"
          value={insights ? formatRevenue(insights.kpis.revenue) : "—"}
          trendPct={insights?.kpis.trends.revenuePct}
          trendLabel="from last month"
          icon={IndianRupee}
          iconBg="bg-cyan-500/10"
          iconColor="text-cyan-600"
          sparkColor="#06b6d4"
          sparkData={insights?.sparklines.revenue}
          loading={isLoading}
        />
        <KpiSparklineCard
          label="Follow-ups Due"
          value={insights?.kpis.followUpsDueToday ?? "—"}
          trendLabel="Due today"
          icon={Calendar}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-600"
          sparkColor="#f59e0b"
          sparkData={insights?.sparklines.followUps}
          loading={isLoading}
        />
      </div>

      <TeamUpdatesPanel highlighted />

      {adminView ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <KpiSparklineCard
            label="Today's collections"
            value={
              collectionsSummary
                ? `₹${collectionsSummary.today.amount.toLocaleString("en-IN")}`
                : "—"
            }
            trendLabel={
              collectionsSummary
                ? `${collectionsSummary.today.count} payment${collectionsSummary.today.count === 1 ? "" : "s"} today`
                : "Paid collections today"
            }
            icon={Receipt}
            iconBg="bg-violet-500/10"
            iconColor="text-violet-600"
            sparkColor="#8b5cf6"
            loading={collectionsLoading}
          />
          <Link href="/payments" className="block">
            <KpiSparklineCard
              label="This month's collections"
              value={
                collectionsSummary
                  ? `₹${collectionsSummary.month.amount.toLocaleString("en-IN")}`
                  : "—"
              }
              trendLabel={
                collectionsSummary
                  ? `${collectionsSummary.month.count} collections this month · View all`
                  : "View collections"
              }
              icon={IndianRupee}
              iconBg="bg-emerald-500/10"
              iconColor="text-emerald-600"
              sparkColor="#10b981"
              loading={collectionsLoading}
            />
          </Link>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="grid gap-6 lg:grid-cols-2">
            <LeadsOverviewChart data={insights?.leadsTrend ?? []} loading={isLoading} />
            <LeadSourceChart
              data={insights?.leadsBySource ?? []}
              total={insights?.kpis.totalLeads ?? 0}
              loading={isLoading}
            />
          </div>
          <RecentLeadsPanel
            leads={filteredLeads as Parameters<typeof RecentLeadsPanel>[0]["leads"]}
            loading={isLoading}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
          />
        </div>
        <div className="space-y-6">
          <ActivitySidebar
            items={activityData?.items ?? []}
            loading={activityLoading}
          />
          {adminView ? (
            <TopSalespeople people={insights?.topSalespeople ?? []} loading={isLoading} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
