"use client";

import { useRouter } from "next/navigation";
import { PremiumDataTable, type RowAction } from "@/components/dashboard/premium-data-table";
import { CompanyAvatar } from "@/components/leads/lead-badges";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";

export type CustomerRow = Record<string, unknown> & {
  id: string;
  companyName?: string;
  ownerName?: string;
  phone?: string;
  email?: string;
  state?: string;
  status?: string;
  createdAt?: string;
  assignedEmployee?: { id?: string; name?: string };
  openWorkItemCount?: number;
};

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function statusBadge(status: string) {
  const styles =
    status === "ACTIVE"
      ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-300"
      : status === "CHURNED"
        ? "bg-rose-500/10 text-rose-700 border-rose-500/25 dark:text-rose-300"
        : "bg-slate-500/10 text-slate-600 border-slate-500/25 dark:text-slate-400";
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", styles)}>
      {status}
    </span>
  );
}

export function CustomerListTable({
  rows,
  loading,
  showAssignee = false,
  emptyMessage,
  rowActions,
}: {
  rows: CustomerRow[];
  loading?: boolean;
  showAssignee?: boolean;
  emptyMessage?: string;
  rowActions?: (row: CustomerRow) => RowAction<CustomerRow>[];
}) {
  const router = useRouter();

  const numberedRows = rows.map((row, index) => ({
    ...row,
    _seq: index + 1,
  }));

  return (
    <PremiumDataTable
      loading={loading}
      rows={numberedRows}
      onRowClick={(row) => router.push(`/customers/${row.id}`)}
      rowActions={rowActions}
      emptyState={
        <div className="py-14 text-center">
          <p className="font-medium text-foreground">No customers found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {emptyMessage ?? "Try changing your search or filters."}
          </p>
        </div>
      }
      columns={[
        {
          key: "seq",
          label: "#",
          className: "w-12",
          render: (row) => (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
              {row._seq as number}
            </span>
          ),
        },
        {
          key: "date",
          label: "Date",
          render: (row) =>
            row.createdAt ? (
              <span className="whitespace-nowrap text-sm">{formatDate(String(row.createdAt))}</span>
            ) : (
              "—"
            ),
        },
        {
          key: "time",
          label: "Time",
          render: (row) =>
            row.createdAt ? (
              <span className="whitespace-nowrap text-sm font-medium text-primary">
                {formatTime(String(row.createdAt))}
              </span>
            ) : (
              "—"
            ),
        },
        {
          key: "company",
          label: "Company",
          render: (row) => {
            const openCount = Number(row.openWorkItemCount ?? 0);
            return (
              <div className="flex items-center gap-3">
                <CompanyAvatar name={String(row.companyName ?? "?")} className="h-8 w-8 text-xs" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-foreground">{String(row.companyName ?? "—")}</p>
                    {openCount > 0 ? (
                      <span
                        className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white"
                        title={`${openCount} open team update${openCount === 1 ? "" : "s"}`}
                      >
                        {openCount}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{String(row.ownerName ?? "")}</p>
                </div>
              </div>
            );
          },
        },
        {
          key: "phone",
          label: "Phone",
          render: (row) =>
            row.phone ? (
              <a
                href={`tel:${row.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="text-primary hover:underline"
              >
                {String(row.phone)}
              </a>
            ) : (
              "—"
            ),
        },
        ...(showAssignee
          ? [
              {
                key: "assigned",
                label: "Assigned to",
                render: (row: CustomerRow) =>
                  row.assignedEmployee?.name ? (
                    <div className="flex items-center gap-2">
                      <UserAvatar name={row.assignedEmployee.name} size="sm" />
                      <span className="text-sm">{row.assignedEmployee.name}</span>
                    </div>
                  ) : (
                    "—"
                  ),
              },
            ]
          : []),
        {
          key: "state",
          label: "State",
          render: (row) => <span className="text-sm">{String(row.state ?? "—")}</span>,
        },
        {
          key: "status",
          label: "Status",
          render: (row) => statusBadge(String(row.status ?? "ACTIVE")),
        },
      ]}
      footer={
        <p className="text-xs text-muted-foreground">
          {rows.length} customer{rows.length === 1 ? "" : "s"} · oldest first · click a row to open full profile
        </p>
      }
    />
  );
}
