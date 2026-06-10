"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ModuleListPage } from "@/components/dashboard/module-list-page";
import { PageHeader } from "@/components/dashboard/page-header";
import { Modal } from "@/components/ui/modal";
import { QuotationForm } from "@/components/quotations/quotation-form";
import { isTempId } from "@/lib/optimistic-mutation";

type QuotationRow = Record<string, unknown>;

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function QuotationsPage() {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotations"
        description="Sales quotations sent to prospects and customers."
        action={
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            + New quotation
          </button>
        }
      />
      <ModuleListPage<QuotationRow>
        title=""
        hideHeader
        endpoint="/quotations"
        queryKey="quotations"
        columns={[
          {
            key: "quotationNumber",
            label: "Quote #",
            render: (row) => (
              <Link href={`/quotations/${row.id}`} className="font-medium text-primary hover:underline">
                {String(row.quotationNumber ?? "—")}
              </Link>
            ),
          },
          {
            key: "grandTotal",
            label: "Total",
            render: (row) => `₹${row.grandTotal ?? "0"}`,
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
          {
            key: "validUntil",
            label: "Valid until",
            render: (row) =>
              row.validUntil ? new Date(String(row.validUntil)).toLocaleDateString() : "—",
          },
        ]}
      />
      <Modal open={showNew} onClose={() => setShowNew(false)} title="New quotation" size="lg">
        <QuotationForm
          onCancel={() => setShowNew(false)}
          onSuccess={(data) => {
            setShowNew(false);
            const id = String(data.id ?? "");
            if (id && !isTempId(id)) router.push(`/quotations/${id}`);
          }}
        />
      </Modal>
    </div>
  );
}
