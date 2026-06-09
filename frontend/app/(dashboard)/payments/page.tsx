"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate, formatLabel, formatMoney } from "@/lib/format";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable } from "@/components/dashboard/data-table";
import { Modal } from "@/components/ui/modal";
import { PaymentForm } from "@/components/payments/payment-form";
import { ListPageSkeleton } from "@/components/ui/skeleton";

type PaymentRow = Record<string, unknown>;

export default function PaymentsPage() {
  const [showNew, setShowNew] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const res = await api.get<PaymentRow[]>("/payments");
      return res.data;
    },
  });

  const rows = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Recorded payments and collection history."
        action={
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            + New Payment
          </button>
        }
      />
      <GlassCard>
        {isLoading ? (
          <ListPageSkeleton rows={6} columns={4} />
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-sm text-red-500">Failed to load payments</p>
            <button type="button" onClick={() => refetch()} className="mt-3 text-sm font-medium text-primary hover:underline">
              Retry
            </button>
          </div>
        ) : (
          <DataTable
            rows={rows}
            columns={[
              {
                key: "paidAmount",
                label: "Amount",
                render: (row) => formatMoney(row.paidAmount),
              },
              {
                key: "paymentMethod",
                label: "Method",
                render: (row) => (row.paymentMethod ? formatLabel(String(row.paymentMethod)) : "—"),
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
                key: "paidDate",
                label: "Paid on",
                render: (row) => formatDate(row.paidDate),
              },
            ]}
          />
        )}
      </GlassCard>
      <Modal open={showNew} onClose={() => setShowNew(false)} title="New payment" size="md">
        <PaymentForm onCancel={() => setShowNew(false)} onSuccess={() => setShowNew(false)} />
      </Modal>
    </div>
  );
}
