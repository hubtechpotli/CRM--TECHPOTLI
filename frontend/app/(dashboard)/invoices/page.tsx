"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate, formatLabel, formatMoney } from "@/lib/format";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable } from "@/components/dashboard/data-table";
import { Modal } from "@/components/ui/modal";
import { ListPageSkeleton } from "@/components/ui/skeleton";
import { InvoiceForm } from "@/components/invoices/invoice-form";

type InvoiceRow = Record<string, unknown> & {
  customer?: { companyName?: string };
};

export default function InvoicesPage() {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const res = await api.get<InvoiceRow[]>("/invoices");
      return res.data;
    },
  });

  const rows = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Billing invoices and payment status."
        action={
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            + New Invoice
          </button>
        }
      />
      <GlassCard>
        {isLoading ? (
          <ListPageSkeleton rows={6} columns={4} />
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-sm text-red-500">Failed to load invoices</p>
            <button type="button" onClick={() => refetch()} className="mt-3 text-sm font-medium text-primary hover:underline">
              Retry
            </button>
          </div>
        ) : (
          <DataTable
            rows={rows}
            columns={[
              {
                key: "invoiceNumber",
                label: "Invoice #",
                render: (row) => (
                  <Link href={`/invoices/${row.id}`} className="font-medium text-primary hover:underline">
                    {String(row.invoiceNumber ?? "—")}
                  </Link>
                ),
              },
              {
                key: "customer",
                label: "Customer",
                render: (row) => String(row.customer?.companyName ?? "—"),
              },
              {
                key: "grandTotal",
                label: "Total",
                render: (row) => formatMoney(row.grandTotal),
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
                key: "dueDate",
                label: "Due",
                render: (row) => formatDate(row.dueDate),
              },
            ]}
          />
        )}
      </GlassCard>
      <Modal open={showNew} onClose={() => setShowNew(false)} title="New invoice" size="xl">
        <InvoiceForm
          onCancel={() => setShowNew(false)}
          onSuccess={(data) => {
            setShowNew(false);
            if (data.id) router.push(`/invoices/${data.id}`);
          }}
        />
      </Modal>
    </div>
  );
}
