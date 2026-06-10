"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Download, FileImage, Plus, Search } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate, formatLabel, formatMoney } from "@/lib/format";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { PremiumDataTable } from "@/components/dashboard/premium-data-table";
import { Modal } from "@/components/ui/modal";
import { ListPageSkeleton } from "@/components/ui/skeleton";
import { PaymentForm } from "@/components/payments/payment-form";
import { SelectInput, TextInput } from "@/components/ui/form-field";
import { useAuthStore } from "@/store/auth-store";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { isAdmin } from "@/lib/roles";
import { useAssignees } from "@/hooks/use-users";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { isTempId } from "@/lib/optimistic-mutation";
import { PAYMENT_STATUSES } from "@/lib/types";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/lib/pagination";
import { PaginationFooter } from "@/components/ui/pagination-footer";

type PaymentRow = Record<string, unknown> & {
  customer?: { companyName?: string };
  createdBy?: { name?: string };
  proofUrl?: string | null;
};

type PaymentsResponse = {
  items: PaymentRow[];
  total: number;
  page: number;
  limit: number;
};

type SummaryResponse = {
  today: { count: number; amount: number };
  month: { count: number; amount: number };
  byUser: Array<{ userId: string; name: string; count: number; amount: number }>;
};

export default function PaymentsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { authReady } = useAuthReady();
  const adminView = isAdmin(user?.role);
  const { data: assignees = [] } = useAssignees();
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [range, setRange] = useState<"" | "today" | "month">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const debouncedSearch = useDebouncedValue(search);

  const dateRange = useMemo(() => {
    const now = new Date();
    if (range === "today") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { from: start.toISOString(), to: now.toISOString() };
    }
    if (range === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: start.toISOString(), to: now.toISOString() };
    }
    return { from: undefined, to: undefined };
  }, [range]);

  const queryParams = useMemo(
    () => ({
      q: debouncedSearch.trim() || undefined,
      status: statusFilter || undefined,
      userId: userFilter || undefined,
      from: dateRange.from,
      to: dateRange.to,
      page,
      limit: pageSize,
    }),
    [debouncedSearch, statusFilter, userFilter, dateRange, page, pageSize],
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["payments", queryParams],
    queryFn: async () => {
      const res = await api.get<PaymentsResponse>("/payments", { params: queryParams });
      return res.data;
    },
    enabled: authReady,
  });

  const { data: summary } = useQuery({
    queryKey: ["payments-summary"],
    queryFn: async () => {
      const res = await api.get<SummaryResponse>("/payments/summary");
      return res.data;
    },
    enabled: authReady && adminView,
  });

  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, userFilter, range, pageSize]);

  async function handleExport() {
    try {
      const res = await api.get<{ csv: string; filename: string }>("/payments/export");
      const blob = new Blob([res.data.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.data.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.alert("Failed to export collections. Please try again.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Collections"
        description={adminView ? "Team collections and payment proofs." : "Your recorded collections."}
        action={
          <div className="flex items-center gap-2">
            {adminView ? (
              <button
                type="button"
                onClick={() => void handleExport()}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setShowNew(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Record collection
            </button>
          </div>
        }
      />

      {adminView && summary ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <GlassCard className="p-4">
            <p className="text-xs text-muted-foreground">Today&apos;s collection</p>
            <p className="mt-1 text-2xl font-bold">{formatMoney(summary.today.amount)}</p>
            <p className="text-xs text-muted-foreground">{summary.today.count} payments</p>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-xs text-muted-foreground">This month</p>
            <p className="mt-1 text-2xl font-bold">{formatMoney(summary.month.amount)}</p>
            <p className="text-xs text-muted-foreground">{summary.month.count} payments</p>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-xs text-muted-foreground">Top collectors (month)</p>
            <ul className="mt-2 space-y-1 text-sm">
              {summary.byUser.slice(0, 3).map((u) => (
                <li key={u.userId} className="flex justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setUserFilter(u.userId)}
                    className="truncate text-left hover:text-primary"
                  >
                    {u.name}
                  </button>
                  <span className="shrink-0 font-medium">{formatMoney(u.amount)}</span>
                </li>
              ))}
            </ul>
          </GlassCard>
        </div>
      ) : null}

      <GlassCard className="space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <div className="pl-8">
              <TextInput value={search} onChange={setSearch} placeholder="Search company, reference…" />
            </div>
          </div>
          <SelectInput
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All statuses"
            options={[{ value: "", label: "All statuses" }, ...PAYMENT_STATUSES.map((s) => ({ value: s, label: formatLabel(s) }))]}
          />
          <SelectInput
            value={range}
            onChange={(v) => setRange(v as "" | "today" | "month")}
            placeholder="All dates"
            options={[
              { value: "", label: "All dates" },
              { value: "today", label: "Today" },
              { value: "month", label: "This month" },
            ]}
          />
          {adminView ? (
            <SelectInput
              value={userFilter}
              onChange={setUserFilter}
              placeholder="All users"
              options={[
                { value: "", label: "All users" },
                ...assignees.map((a) => ({ value: a.id, label: a.name })),
              ]}
            />
          ) : null}
        </div>

        {isLoading ? (
          <ListPageSkeleton rows={6} columns={5} />
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-sm text-red-500">Failed to load collections</p>
            <button type="button" onClick={() => refetch()} className="mt-3 text-sm font-medium text-primary hover:underline">
              Retry
            </button>
          </div>
        ) : (
          <PremiumDataTable
            rows={rows}
            onRowClick={(row) => {
              if (!isTempId(String(row.id))) router.push(`/payments/${row.id}`);
            }}
            columns={[
              {
                key: "company",
                label: "Company",
                render: (row) => (
                  <Link
                    href={isTempId(String(row.id)) ? "#" : `/payments/${row.id}`}
                    onClick={(e) => {
                      if (isTempId(String(row.id))) e.preventDefault();
                    }}
                    className="font-medium hover:text-primary"
                  >
                    {String(row.customer?.companyName ?? "—")}
                  </Link>
                ),
              },
              {
                key: "paidAmount",
                label: "Amount",
                render: (row) => formatMoney(row.paidAmount),
              },
              {
                key: "status",
                label: "Status",
                render: (row) => (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {formatLabel(String(row.status ?? "—"))}
                  </span>
                ),
              },
              {
                key: "collectedAt",
                label: "Collected",
                render: (row) => formatDate(row.collectedAt ?? row.createdAt),
              },
              ...(adminView
                ? [
                    {
                      key: "createdBy",
                      label: "Recorded by",
                      render: (row: PaymentRow) => String(row.createdBy?.name ?? "—"),
                    },
                  ]
                : []),
              {
                key: "proof",
                label: "Proof",
                render: (row) =>
                  row.proofUrl ? (
                    <FileImage className="h-4 w-4 text-primary" />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  ),
              },
            ]}
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
                className="px-2"
              />
            }
          />
        )}
      </GlassCard>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Record collection" size="lg">
        <PaymentForm
          onCancel={() => setShowNew(false)}
          onSuccess={() => {
            setShowNew(false);
            void refetch();
          }}
        />
      </Modal>
    </div>
  );
}
