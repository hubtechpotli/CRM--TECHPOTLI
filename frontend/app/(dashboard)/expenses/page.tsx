"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { patchListItem } from "@/lib/optimistic-mutation";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { LIST_STALE_MS } from "@/lib/query-stale";
import { formatDate, formatLabel, formatMoney } from "@/lib/format";
import { isSuperAdmin } from "@/lib/roles";
import { useAuthStore } from "@/store/auth-store";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { CrmPageShell } from "@/components/dashboard/crm-page-shell";
import { SectionCard } from "@/components/dashboard/section-card";
import { DataTable } from "@/components/dashboard/data-table";
import { ListPageSkeleton } from "@/components/ui/skeleton";
import { ListActionButton } from "@/components/dashboard/list-actions";
import { Modal } from "@/components/ui/modal";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { useRouteColor } from "@/hooks/use-route-color";

type ExpenseRow = Record<string, unknown> & {
  paidBy?: { name?: string };
};

export default function ExpensesPage() {
  const routeColor = useRouteColor();
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const { authReady } = useAuthReady();
  const superAdmin = isSuperAdmin(role);
  const [showNew, setShowNew] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const res = await api.get<ExpenseRow[]>("/expenses");
      return res.data;
    },
    enabled: authReady,
    staleTime: LIST_STALE_MS,
  });

  const approveMutation = useOptimisticMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" }) => {
      const res = await api.patch(`/expenses/${id}/${action}`);
      return res.data;
    },
    snapshotKeys: [["expenses"]],
    invalidateKeys: [["expenses"]],
    onMutate: ({ id, action }) => {
      patchListItem(queryClient, ["expenses"], id, {
        status: action === "approve" ? "APPROVED" : "REJECTED",
      });
      setActionError(null);
    },
    onError: (err) => {
      const message = isAxiosError(err)
        ? (err.response?.data as { message?: string | string[] })?.message ?? err.message
        : "Action failed";
      setActionError(Array.isArray(message) ? message.join(", ") : String(message));
    },
  });

  const rows = Array.isArray(data) ? data : [];

  return (
    <CrmPageShell
      hideHeader
      title=""
      actions={
        <button type="button" onClick={() => setShowNew(true)} className={routeColor.btn}>
          + New Expense
        </button>
      }
    >
      {actionError ? (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{actionError}</p>
      ) : null}
      <SectionCard accent={routeColor}>
        {isLoading ? (
          <ListPageSkeleton rows={6} columns={4} />
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-sm text-red-500">Failed to load expenses</p>
            <button type="button" onClick={() => refetch()} className="mt-3 text-sm font-medium text-primary hover:underline">
              Retry
            </button>
          </div>
        ) : (
          <DataTable
            rows={rows}
            columns={[
              { key: "description", label: "Description" },
              {
                key: "category",
                label: "Category",
                render: (row) => formatLabel(String(row.category ?? "—")),
              },
              {
                key: "amount",
                label: "Amount",
                render: (row) => formatMoney(row.amount),
              },
              {
                key: "date",
                label: "Date",
                render: (row) => formatDate(row.date),
              },
              {
                key: "status",
                label: "Status",
                render: (row) => (
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                    {formatLabel(String(row.status ?? "—"))}
                  </span>
                ),
              },
              ...(superAdmin
                ? [
                    {
                      key: "actions",
                      label: "Actions",
                      render: (row: ExpenseRow) =>
                        row.status === "PENDING" ? (
                          <div className="flex gap-2">
                            <ListActionButton
                              label="Approve"
                              variant="success"
                              disabled={approveMutation.isPending}
                              onClick={() => approveMutation.mutate({ id: String(row.id), action: "approve" })}
                            />
                            <ListActionButton
                              label="Reject"
                              variant="danger"
                              disabled={approveMutation.isPending}
                              onClick={() => approveMutation.mutate({ id: String(row.id), action: "reject" })}
                            />
                          </div>
                        ) : (
                          "—"
                        ),
                    },
                  ]
                : []),
            ]}
          />
        )}
      </SectionCard>
      <Modal open={showNew} onOpenChange={setShowNew} title="New expense" size="lg">
        <ExpenseForm onCancel={() => setShowNew(false)} onSuccess={() => setShowNew(false)} />
      </Modal>
    </CrmPageShell>
  );
}
