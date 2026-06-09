"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { formatDate, formatLabel, formatMoney } from "@/lib/format";
import { isSuperAdmin } from "@/lib/roles";
import { useAuthStore } from "@/store/auth-store";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable } from "@/components/dashboard/data-table";
import { ListPageSkeleton } from "@/components/ui/skeleton";
import { ListActionButton } from "@/components/dashboard/list-actions";
import { Modal } from "@/components/ui/modal";
import { ExpenseForm } from "@/components/expenses/expense-form";

type ExpenseRow = Record<string, unknown> & {
  paidBy?: { name?: string };
};

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const superAdmin = isSuperAdmin(role);
  const [showNew, setShowNew] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const res = await api.get<ExpenseRow[]>("/expenses");
      return res.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" }) => {
      const res = await api.patch(`/expenses/${id}/${action}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
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
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Company expenses and reimbursements."
        action={
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            + New Expense
          </button>
        }
      />
      {actionError ? (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{actionError}</p>
      ) : null}
      <GlassCard>
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
      </GlassCard>
      <Modal open={showNew} onClose={() => setShowNew(false)} title="New expense" size="lg">
        <ExpenseForm onCancel={() => setShowNew(false)} onSuccess={() => setShowNew(false)} />
      </Modal>
    </div>
  );
}
