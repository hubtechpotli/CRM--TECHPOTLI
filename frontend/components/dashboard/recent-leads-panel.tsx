"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Filter } from "lucide-react";
import { SectionCard } from "@/components/dashboard/section-card";
import { StatusTabs } from "@/components/dashboard/status-tabs";
import { PremiumDataTable } from "@/components/dashboard/premium-data-table";
import { CompanyAvatar, LeadPriorityBadge, LeadStatusBadge } from "@/components/leads/lead-badges";
import { UserAvatar } from "@/components/ui/user-avatar";
import { timeAgo } from "@/lib/format";
import { isAdmin } from "@/lib/roles";
import { useAuthStore } from "@/store/auth-store";

type LeadRow = Record<string, unknown> & {
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

const TABS = [
  { value: "", label: "All Leads" },
  { value: "NEW", label: "New" },
  { value: "FOLLOW_UP", label: "Follow Up" },
  { value: "PROPOSAL_SENT", label: "Proposal Sent" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
];

export function RecentLeadsPanel({
  leads,
  loading,
  statusFilter,
  onStatusChange,
}: {
  leads: LeadRow[];
  loading?: boolean;
  statusFilter: string;
  onStatusChange: (status: string) => void;
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const adminView = isAdmin(user?.role);

  const columns = [
    {
      key: "company",
      label: "Lead / Company",
      render: (row: LeadRow) => (
        <Link href={`/leads/${row.id}`} className="flex items-center gap-3 group">
          <CompanyAvatar name={String(row.companyName ?? "?")} className="h-8 w-8 text-xs" />
          <div className="min-w-0">
            <p className="truncate font-medium group-hover:text-primary">{String(row.companyName ?? "—")}</p>
            <p className="truncate text-[11px] text-muted-foreground">{String(row.contactName ?? "")}</p>
          </div>
        </Link>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      render: (row: LeadRow) =>
        row.phone ? (
          <a href={`tel:${row.phone}`} className="text-primary hover:underline">
            {String(row.phone)}
          </a>
        ) : (
          "—"
        ),
    },
    ...(adminView
      ? [
          {
            key: "assignedTo",
            label: "Sales Person",
            render: (row: LeadRow) => (
              <div className="flex items-center gap-2">
                {row.assignedTo?.name ? (
                  <>
                    <UserAvatar name={row.assignedTo.name} size="sm" />
                    <span className="text-sm">{row.assignedTo.name}</span>
                  </>
                ) : (
                  "—"
                )}
              </div>
            ),
          },
        ]
      : []),
    {
      key: "priority",
      label: "Priority",
      render: (row: LeadRow) =>
        row.priority ? <LeadPriorityBadge priority={String(row.priority)} /> : "—",
    },
    {
      key: "status",
      label: "Status",
      render: (row: LeadRow) => <LeadStatusBadge status={String(row.status ?? "")} showIcon />,
    },
    {
      key: "lastActivity",
      label: "Last Activity",
      render: (row: LeadRow) => {
        const act = row.activities?.[0]?.createdAt;
        const ts = act ?? row.updatedAt;
        return (
          <span className="text-xs text-muted-foreground">
            {ts ? timeAgo(ts) : "—"}
          </span>
        );
      },
    },
  ];

  return (
    <SectionCard
      title="Recent Leads"
      subtitle="Click any row to open"
      compact
      action="View all"
      actionHref="/leads"
      noPadding
    >
      <div className="space-y-2 px-3 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusTabs tabs={TABS} value={statusFilter} onChange={onStatusChange} />
          <Link
            href="/leads"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted"
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
          </Link>
        </div>
      </div>
      <PremiumDataTable
        columns={columns}
        rows={leads}
        loading={loading}
        onRowClick={(row) => router.push(`/leads/${row.id}`)}
        rowActions={(row) => [
          { label: "View lead", onClick: () => router.push(`/leads/${row.id}`) },
        ]}
        footer={
          <p className="text-xs text-muted-foreground">
            Showing {leads.length} lead{leads.length === 1 ? "" : "s"}
          </p>
        }
      />
    </SectionCard>
  );
}
