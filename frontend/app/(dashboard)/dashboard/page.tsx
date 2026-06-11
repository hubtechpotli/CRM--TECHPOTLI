"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, IndianRupee, Receipt, Trophy, UserPlus } from "lucide-react";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import { isAdmin } from "@/lib/roles";
import { useAuthStore } from "@/store/auth-store";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { KpiSparklineCard } from "@/components/dashboard/kpi-sparkline-card";
import { DashboardHeroBanner } from "@/components/dashboard/dashboard-hero-banner";
import { TeamUpdatesPanel } from "@/components/dashboard/team-updates-panel";
import { LIST_STALE_MS, REPORTS_STALE_MS } from "@/lib/query-stale";

const LeadsOverviewChart = dynamic(
  () => import("@/components/dashboard/leads-overview-chart").then((m) => m.LeadsOverviewChart),
  { ssr: false, loading: () => <div className="h-44 animate-pulse rounded-xl bg-muted/40" /> },
);
const LeadSourceChart = dynamic(
  () => import("@/components/dashboard/lead-source-chart").then((m) => m.LeadSourceChart),
  { ssr: false, loading: () => <div className="h-44 animate-pulse rounded-xl bg-muted/40" /> },
);
const RecentLeadsPanel = dynamic(
  () => import("@/components/dashboard/recent-leads-panel").then((m) => m.RecentLeadsPanel),
  { ssr: false, loading: () => <div className="h-48 animate-pulse rounded-xl bg-muted/40" /> },
);
const ActivitySidebar = dynamic(
  () => import("@/components/dashboard/activity-sidebar").then((m) => m.ActivitySidebar),
  { ssr: false, loading: () => <div className="h-52 animate-pulse rounded-xl bg-muted/40" /> },
);
const TopSalespeople = dynamic(
  () => import("@/components/dashboard/top-salespeople").then((m) => m.TopSalespeople),
  { ssr: false, loading: () => <div className="h-40 animate-pulse rounded-xl bg-muted/40" /> },
);

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

type DashboardLeadRow = Record<string, unknown> & {
  id: string;
  companyName?: string;
  contactName?: string;
  phone?: string;
  status?: string;
  priority?: string;
  updatedAt?: string;
  assignedTo?: { name?: string };
  activities?: Array<{ createdAt: string }>;
};

function formatRevenue(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

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
    staleTime: REPORTS_STALE_MS,
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ["activity-log-recent"],
    queryFn: async () => {
      const res = await api.get<{ items: ActivityItem[] }>("/activity-log?take=6");
      return res.data;
    },
    enabled: authReady,
    staleTime: LIST_STALE_MS,
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
    staleTime: REPORTS_STALE_MS,
  });

  const filteredLeads = useMemo(() => {
    const leads = insights?.recentLeads ?? [];
    if (!statusFilter) return leads;
    return leads.filter((l) => l.status === statusFilter);
  }, [insights?.recentLeads, statusFilter]);

  const kpiGridClass = adminView
    ? "grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
    : "grid gap-2 sm:grid-cols-2 xl:grid-cols-4";

  return (
    <div className="space-y-3">
      <DashboardHeroBanner
        userName={user?.name}
        totalLeads={insights?.kpis.totalLeads}
        convertedLeads={insights?.kpis.convertedLeads}
        followUpsDue={insights?.kpis.followUpsDueToday}
        loading={isLoading}
      />

      <section aria-label="Key metrics" className={kpiGridClass}>
        <KpiSparklineCard
          label="Total Leads"
          value={insights?.kpis.totalLeads ?? "—"}
          trendPct={insights?.kpis.trends.totalLeadsPct}
          trendLabel="vs last month"
          icon={UserPlus}
          iconBg="bg-indigo-500/12"
          iconColor="text-indigo-600 dark:text-indigo-400"
          sparkColor="#6366f1"
          accentBorder="border-indigo-200/60 hover:border-indigo-300/80"
          sparkData={insights?.sparklines.totalLeads}
          loading={isLoading}
          href="/leads"
        />
        <KpiSparklineCard
          label="Converted"
          value={insights?.kpis.convertedLeads ?? "—"}
          trendPct={insights?.kpis.trends.convertedPct}
          trendLabel="vs last month"
          icon={Trophy}
          iconBg="bg-emerald-500/12"
          iconColor="text-emerald-600 dark:text-emerald-400"
          sparkColor="#10b981"
          accentBorder="border-emerald-200/60 hover:border-emerald-300/80"
          sparkData={insights?.sparklines.converted}
          loading={isLoading}
          href="/leads?status=WON"
        />
        <KpiSparklineCard
          label="Revenue"
          value={insights ? formatRevenue(insights.kpis.revenue) : "—"}
          trendPct={insights?.kpis.trends.revenuePct}
          trendLabel="vs last month"
          icon={IndianRupee}
          iconBg="bg-cyan-500/12"
          iconColor="text-cyan-600 dark:text-cyan-400"
          sparkColor="#06b6d4"
          accentBorder="border-cyan-200/60 hover:border-cyan-300/80"
          sparkData={insights?.sparklines.revenue}
          loading={isLoading}
          href="/invoices"
        />
        <KpiSparklineCard
          label="Follow-ups"
          value={insights?.kpis.followUpsDueToday ?? "—"}
          trendLabel="due today"
          icon={Calendar}
          iconBg="bg-amber-500/12"
          iconColor="text-amber-600 dark:text-amber-400"
          sparkColor="#f59e0b"
          accentBorder="border-amber-200/60 hover:border-amber-300/80"
          sparkData={insights?.sparklines.followUps}
          loading={isLoading}
          href="/leads"
        />
        {adminView ? (
          <>
            <KpiSparklineCard
              label="Today"
              value={
                collectionsSummary
                  ? `₹${collectionsSummary.today.amount.toLocaleString("en-IN")}`
                  : "—"
              }
              trendLabel={
                collectionsSummary
                  ? `${collectionsSummary.today.count} payment${collectionsSummary.today.count === 1 ? "" : "s"}`
                  : "collections"
              }
              icon={Receipt}
              iconBg="bg-violet-500/12"
              iconColor="text-violet-600 dark:text-violet-400"
              sparkColor="#8b5cf6"
              accentBorder="border-violet-200/60 hover:border-violet-300/80"
              loading={collectionsLoading}
              href="/payments"
            />
            <KpiSparklineCard
              label="This Month"
              value={
                collectionsSummary
                  ? `₹${collectionsSummary.month.amount.toLocaleString("en-IN")}`
                  : "—"
              }
              trendLabel={
                collectionsSummary
                  ? `${collectionsSummary.month.count} collections`
                  : "view all"
              }
              icon={IndianRupee}
              iconBg="bg-teal-500/12"
              iconColor="text-teal-600 dark:text-teal-400"
              sparkColor="#14b8a6"
              accentBorder="border-teal-200/60 hover:border-teal-300/80"
              loading={collectionsLoading}
              href="/payments"
            />
          </>
        ) : null}
      </section>

      <TeamUpdatesPanel />

      <div className="grid gap-3 xl:grid-cols-12">
        <div className="space-y-3 xl:col-span-8">
          <div className="grid gap-3 lg:grid-cols-2">
            <LeadsOverviewChart data={insights?.leadsTrend ?? []} loading={isLoading} />
            <LeadSourceChart
              data={insights?.leadsBySource ?? []}
              total={insights?.kpis.totalLeads ?? 0}
              loading={isLoading}
            />
          </div>
          <RecentLeadsPanel
            leads={filteredLeads as DashboardLeadRow[]}
            loading={isLoading}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
          />
        </div>
        <aside className="space-y-3 xl:col-span-4">
          <ActivitySidebar items={activityData?.items ?? []} loading={activityLoading} />
          {adminView ? (
            <TopSalespeople people={insights?.topSalespeople ?? []} loading={isLoading} />
          ) : null}
        </aside>
      </div>
    </div>
  );
}
