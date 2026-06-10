"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { removeListItem } from "@/lib/optimistic-mutation";
import { isAxiosError } from "axios";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Calendar,
  Columns3,
  Filter,
  Flame,
  List,
  Plus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";

const LeadKanban = dynamic(() => import("@/components/leads/lead-kanban").then((m) => m.LeadKanban), {
  ssr: false,
  loading: () => (
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-96 animate-pulse rounded-2xl border border-border/60 bg-muted/30" />
      ))}
    </div>
  ),
});
import { LeadForm } from "@/components/leads/lead-form";
import { isTempId } from "@/lib/optimistic-mutation";
import {
  CompanyAvatar,
  LeadConversionBadge,
  LeadPriorityBadge,
  LeadStatusBadge,
} from "@/components/leads/lead-badges";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/lib/pagination";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { StatusTabs } from "@/components/dashboard/status-tabs";
import { SectionCard } from "@/components/dashboard/section-card";
import { PremiumDataTable, type RowAction } from "@/components/dashboard/premium-data-table";
import { Modal } from "@/components/ui/modal";
import { SelectInput } from "@/components/ui/form-field";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAssignees } from "@/hooks/use-users";
import { useAuthStore } from "@/store/auth-store";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { isAdmin, isSuperAdmin } from "@/lib/roles";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { computeKanbanStats } from "@/lib/lead-ui";

type LeadRow = Record<string, unknown> & {
  assignedTo?: { name?: string };
  convertedToCustomerId?: string;
  activities?: Array<{ createdAt: string }>;
};

type PaginatedLeads = { items: LeadRow[]; total: number; page: number; limit: number };

const STATUS_TABS = [
  { value: "", label: "All Leads" },
  { value: "NEW", label: "New" },
  { value: "FOLLOW_UP", label: "Follow Up" },
  { value: "PROPOSAL_SENT", label: "Proposal Sent" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
];

export default function LeadsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { authReady } = useAuthReady();
  const adminView = isAdmin(user?.role);
  const canDelete = isSuperAdmin(user?.role);
  const { data: assignees = [] } = useAssignees();
  const [view, setView] = useState<"list" | "kanban">("list");
  const [showNewLead, setShowNewLead] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteMutation = useOptimisticMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/leads/${id}`);
    },
    snapshotKeys: [["leads"], ["leads-kanban"]],
    invalidateKeys: [["leads"], ["leads-kanban"]],
    onMutate: (id) => {
      setDeleteError(null);
      for (const query of queryClient.getQueryCache().findAll({ queryKey: ["leads"] })) {
        removeListItem(queryClient, query.queryKey, id);
      }
    },
    onError: (err) => {
      setDeleteError(
        isAxiosError(err)
          ? String((err.response?.data as { message?: string })?.message ?? err.message)
          : "Failed to delete lead",
      );
    },
  });

  function handleDeleteLead(row: LeadRow) {
    const name = String(row.companyName ?? "this lead");
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    deleteMutation.mutate(String(row.id));
  }

  useEffect(() => {
    if (searchParams.get("new") === "1") setShowNewLead(true);
  }, [searchParams]);

  const { data: kanbanData } = useQuery({
    queryKey: ["leads-kanban"],
    enabled: authReady && view === "kanban",
    queryFn: async () => {
      const res = await api.get<Record<string, LeadRow[]>>("/leads/kanban");
      return res.data;
    },
    staleTime: 30_000,
  });

  const stats = useMemo(() => computeKanbanStats(kanbanData), [kanbanData]);

  const { data: leadsData, isLoading } = useQuery({
    queryKey: ["leads", statusFilter, assigneeFilter, page, pageSize],
    enabled: authReady && view === "list",
    queryFn: async () => {
      const res = await api.get<PaginatedLeads>("/leads", {
        params: {
          page,
          limit: pageSize,
          status: statusFilter || undefined,
          assignedToId: assigneeFilter || undefined,
        },
      });
      return res.data;
    },
  });

  const rows = leadsData?.items ?? [];
  const total = leadsData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const listActions = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setShowNewLead(true)}
        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm"
      >
        <Plus className="h-3.5 w-3.5" />
        New Lead
      </button>
      <div className="flex rounded-xl border border-border bg-muted/40 p-0.5">
        <button
          type="button"
          onClick={() => setView("list")}
          className={cn(
            "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium",
            view === "list" ? "bg-card text-primary shadow-sm" : "text-muted-foreground",
          )}
        >
          <List className="h-3.5 w-3.5" /> List
        </button>
        <button
          type="button"
          onClick={() => setView("kanban")}
          className={cn(
            "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium",
            view === "kanban" ? "bg-card text-primary shadow-sm" : "text-muted-foreground",
          )}
        >
          <Columns3 className="h-3.5 w-3.5" /> Kanban
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {deleteError ? (
        <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-600 dark:text-red-400">{deleteError}</p>
      ) : null}
      <PageToolbar
        title={adminView ? "All Leads" : "My Leads"}
        description={
          adminView
            ? "View and manage leads across all salespeople."
            : "Add leads you call, update status, and track your pipeline."
        }
        actions={listActions}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Active leads", value: stats.total, icon: Users, color: "text-indigo-600 bg-indigo-500/10" },
          { label: "Due today", value: stats.dueToday, icon: Calendar, color: "text-cyan-600 bg-cyan-500/10" },
          { label: "Overdue", value: stats.overdue, icon: AlertTriangle, color: "text-amber-600 bg-amber-500/10" },
          { label: "Hot priority", value: stats.hot, icon: Flame, color: "text-rose-600 bg-rose-500/10" },
        ].map((kpi) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <div className={cn("rounded-lg p-1.5", kpi.color)}>
                <kpi.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold">{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      {view === "list" ? (
        <SectionCard noPadding>
          <div className="space-y-4 border-b border-border/50 p-5">
            <StatusTabs
              tabs={STATUS_TABS}
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            />
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Filter className="h-3.5 w-3.5" /> Filters
              </div>
              {adminView ? (
                <div className="w-44">
                  <SelectInput
                    value={assigneeFilter}
                    onChange={(v) => {
                      setAssigneeFilter(v);
                      setPage(1);
                    }}
                    placeholder="All salespeople"
                    options={assignees.map((a) => ({ value: a.id, label: a.name }))}
                  />
                </div>
              ) : null}
              {assigneeFilter ? (
                <button
                  type="button"
                  onClick={() => {
                    setAssigneeFilter("");
                    setPage(1);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              ) : null}
            </div>
          </div>
          <PremiumDataTable
            loading={isLoading}
            rows={rows}
            onRowClick={(row) => {
              if (!isTempId(String(row.id))) router.push(`/leads/${row.id}`);
            }}
            rowActions={(row) => {
              if (isTempId(String(row.id))) return [];
              const actions: RowAction<typeof row>[] = [
                { label: "View lead", onClick: () => router.push(`/leads/${row.id}`) },
              ];
              if (canDelete) {
                actions.push({
                  label: "Delete",
                  onClick: () => handleDeleteLead(row),
                  destructive: true,
                });
              }
              return actions;
            }}
            columns={[
              {
                key: "company",
                label: "Lead / Company",
                render: (row) => (
                  <Link href={`/leads/${row.id}`} className="flex items-center gap-3">
                    <CompanyAvatar name={String(row.companyName ?? "?")} className="h-8 w-8 text-xs" />
                    <div>
                      <p className="font-medium">{String(row.companyName ?? "—")}</p>
                      <p className="text-[11px] text-muted-foreground">{String(row.contactName ?? "")}</p>
                    </div>
                  </Link>
                ),
              },
              {
                key: "phone",
                label: "Phone",
                render: (row) =>
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
                      render: (row: LeadRow) =>
                        row.assignedTo?.name ? (
                          <div className="flex items-center gap-2">
                            <UserAvatar name={row.assignedTo.name} size="sm" />
                            <span className="text-sm">{row.assignedTo.name}</span>
                          </div>
                        ) : (
                          "—"
                        ),
                    },
                  ]
                : []),
              {
                key: "priority",
                label: "Priority",
                render: (row) =>
                  row.priority ? <LeadPriorityBadge priority={String(row.priority)} /> : "—",
              },
              {
                key: "status",
                label: "Status",
                render: (row) => <LeadStatusBadge status={String(row.status ?? "")} />,
              },
              {
                key: "lastActivity",
                label: "Last Activity",
                render: (row) => {
                  const ts = row.activities?.[0]?.createdAt ?? row.updatedAt;
                  return <span className="text-xs text-muted-foreground">{ts ? timeAgo(ts) : "—"}</span>;
                },
              },
              {
                key: "conversion",
                label: "Conversion",
                render: (row) => (
                  <LeadConversionBadge
                    status={String(row.status ?? "")}
                    convertedToCustomerId={row.convertedToCustomerId}
                  />
                ),
              },
            ]}
            emptyState={
              <div className="flex flex-col items-center py-12 text-center">
                <UserPlus className="mb-3 h-10 w-10 text-primary/40" />
                <p className="font-medium">No leads found</p>
                <button
                  type="button"
                  onClick={() => setShowNewLead(true)}
                  className="mt-3 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                >
                  Create lead
                </button>
              </div>
            }
            footer={
              <PaginationFooter
                page={page}
                totalPages={totalPages}
                totalCount={total}
                limit={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  if (PAGE_SIZE_OPTIONS.includes(size as (typeof PAGE_SIZE_OPTIONS)[number])) {
                    setPageSize(size);
                    setPage(1);
                  }
                }}
              />
            }
          />
        </SectionCard>
      ) : (
        <LeadKanban showSalesPerson={adminView} />
      )}

      <Modal open={showNewLead} onClose={() => setShowNewLead(false)} title="New lead" size="lg">
        <LeadForm
          onCancel={() => setShowNewLead(false)}
          onSuccess={(data) => {
            setShowNewLead(false);
            const id = String(data.id ?? "");
            if (id && !isTempId(id)) router.push(`/leads/${id}`);
          }}
        />
      </Modal>
    </div>
  );
}
