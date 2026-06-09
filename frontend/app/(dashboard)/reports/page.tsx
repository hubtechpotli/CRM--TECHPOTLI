"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { isAdmin } from "@/lib/roles";
import {
  Users,
  FolderKanban,
  FileText,
  Wallet,
  LifeBuoy,
  RefreshCw,
  UserPlus,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { ExportButtons } from "@/components/export-buttons";
import { CardSkeleton, KpiRowSkeleton, Skeleton } from "@/components/ui/skeleton";

type ReportStats = {
  leads: number;
  activeCustomers: number;
  activeProjects: number;
  pendingInvoices: number;
  totalRevenue: string | number | null;
  openTickets: number;
  renewalsDue: number;
};

type EmployeePerf = {
  id: string;
  name: string;
  leads: number;
  convertedLeads: number;
  customers: number;
};

type MrrData = { mrr: number; activeServices: number };
type PlData = { revenue: number; expenses: number; profit: number };

type TeamWorkEmployee = {
  id: string;
  name: string;
  assigned: number;
  inProgress: number;
  completed30d: number;
  overdue: number;
  avgDaysToComplete: number | null;
  lastActivity: string | null;
};

type TeamWorkReport = {
  employees: TeamWorkEmployee[];
  summary: { unassignedOpen: number; staleItems: number };
};

const statConfig: {
  key: keyof ReportStats;
  label: string;
  icon: typeof UserPlus;
  tone: string;
  format?: (v: unknown) => string;
}[] = [
  { key: "leads", label: "Total leads", icon: UserPlus, tone: "text-primary" },
  { key: "activeCustomers", label: "Active customers", icon: Users, tone: "text-accent" },
  { key: "activeProjects", label: "Active projects", icon: FolderKanban, tone: "text-primary" },
  { key: "pendingInvoices", label: "Pending invoices", icon: FileText, tone: "text-accent" },
  {
    key: "totalRevenue",
    label: "Total revenue",
    icon: Wallet,
    tone: "text-primary",
    format: (v: unknown) => `₹${v ?? 0}`,
  },
  { key: "openTickets", label: "Open tickets", icon: LifeBuoy, tone: "text-accent" },
  { key: "renewalsDue", label: "Renewals due", icon: RefreshCw, tone: "text-primary" },
];

function StatCardSkeleton() {
  return (
    <GlassCard>
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-3 h-8 w-20" />
    </GlassCard>
  );
}

export default function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const adminView = isAdmin(user?.role);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["reports-dashboard"],
    queryFn: async () => {
      const res = await api.get<ReportStats>("/reports/dashboard");
      return res.data;
    },
  });

  const { data: leaderboard = [], isLoading: leaderboardLoading } = useQuery({
    queryKey: ["employee-performance"],
    queryFn: async () => {
      const res = await api.get<EmployeePerf[]>("/reports/employee-performance");
      return res.data;
    },
  });

  const { data: mrr, isLoading: mrrLoading } = useQuery({
    queryKey: ["mrr"],
    queryFn: async () => {
      const res = await api.get<MrrData>("/reports/mrr");
      return res.data;
    },
  });

  const { data: pl, isLoading: plLoading } = useQuery({
    queryKey: ["profit-loss"],
    queryFn: async () => {
      const res = await api.get<PlData>("/reports/profit-loss");
      return res.data;
    },
  });

  const { data: teamWork, isLoading: teamWorkLoading } = useQuery({
    queryKey: ["reports-team-work"],
    queryFn: async () => {
      const res = await api.get<TeamWorkReport>("/reports/team-work");
      return res.data;
    },
    enabled: adminView,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Business KPIs, MRR, P&L, and employee performance."
        action={<ExportButtons module="customers" />}
      />
      {error ? (
        <GlassCard>
          <div className="py-8 text-center">
            <p className="text-sm text-red-500">Failed to load reports</p>
            <button type="button" onClick={() => refetch()} className="mt-3 text-sm font-medium text-primary hover:underline">
              Retry
            </button>
          </div>
        </GlassCard>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {isLoading
              ? statConfig.map(({ key }) => <StatCardSkeleton key={key} />)
              : statConfig.map(({ key, label, icon: Icon, tone, format }) => (
                  <GlassCard key={key}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <Icon className={`h-4 w-4 ${tone}`} />
                    </div>
                    <p className="mt-2 text-2xl font-semibold">
                      {format ? format(data?.[key]) : String(data?.[key] ?? "—")}
                    </p>
                  </GlassCard>
                ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {mrrLoading ? (
              <StatCardSkeleton />
            ) : (
              <GlassCard>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-accent" />
                  <h3 className="text-sm font-semibold">MRR</h3>
                </div>
                <p className="mt-2 text-2xl font-semibold">₹{mrr?.mrr ?? 0}</p>
                <p className="text-xs text-muted-foreground">{mrr?.activeServices ?? 0} active services</p>
              </GlassCard>
            )}
            {plLoading ? (
              <StatCardSkeleton />
            ) : (
              <GlassCard>
                <h3 className="text-sm font-semibold">Profit & loss (6 mo)</h3>
                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between"><dt>Revenue</dt><dd>₹{pl?.revenue ?? 0}</dd></div>
                  <div className="flex justify-between"><dt>Expenses</dt><dd>₹{pl?.expenses ?? 0}</dd></div>
                  <div className="flex justify-between font-semibold"><dt>Profit</dt><dd>₹{pl?.profit ?? 0}</dd></div>
                </dl>
              </GlassCard>
            )}
            <GlassCard>
              <h3 className="mb-3 text-sm font-semibold">Export data</h3>
              <div className="space-y-2">
                <ExportButtons module="leads" />
                <ExportButtons module="invoices" />
                <ExportButtons module="payments" />
              </div>
            </GlassCard>
          </div>
          {adminView ? (
            teamWorkLoading ? (
              <CardSkeleton className="h-64" />
            ) : teamWork ? (
              <GlassCard>
                <h3 className="mb-1 text-sm font-semibold">Team work activity</h3>
                <p className="mb-4 text-xs text-muted-foreground">
                  {teamWork.summary.unassignedOpen} unassigned open items · {teamWork.summary.staleItems} stale (no update in 7 days)
                </p>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase text-muted-foreground">
                      <th className="py-2">Employee</th>
                      <th className="py-2">Assigned</th>
                      <th className="py-2">In progress</th>
                      <th className="py-2">Completed (30d)</th>
                      <th className="py-2">Overdue</th>
                      <th className="py-2">Avg days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamWork.employees.map((e) => (
                      <tr key={e.id} className="border-b border-border/40">
                        <td className="py-2 font-medium">{e.name}</td>
                        <td className="py-2">{e.assigned}</td>
                        <td className="py-2">{e.inProgress}</td>
                        <td className="py-2">{e.completed30d}</td>
                        <td className="py-2">{e.overdue > 0 ? <span className="text-red-500">{e.overdue}</span> : 0}</td>
                        <td className="py-2">{e.avgDaysToComplete ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </GlassCard>
            ) : null
          ) : null}
          <GlassCard>
            <h3 className="mb-4 text-sm font-semibold">Employee leaderboard</h3>
            {leaderboardLoading ? (
              <KpiRowSkeleton count={3} />
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase text-muted-foreground">
                    <th className="py-2">Name</th>
                    <th className="py-2">Leads</th>
                    <th className="py-2">Converted</th>
                    <th className="py-2">Customers</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.slice(0, 10).map((e) => (
                    <tr key={e.id} className="border-b border-border/40">
                      <td className="py-2">{e.name}</td>
                      <td className="py-2">{e.leads}</td>
                      <td className="py-2">{e.convertedLeads}</td>
                      <td className="py-2">{e.customers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </GlassCard>
        </>
      )}
    </div>
  );
}
