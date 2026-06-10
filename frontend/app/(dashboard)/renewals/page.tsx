"use client";

import { useState } from "react";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, normalizePaginated } from "@/lib/pagination";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate, formatLabel, formatMoney } from "@/lib/format";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable } from "@/components/dashboard/data-table";
import { ListPageSkeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import { RenewalForm } from "@/components/renewals/renewal-form";
import { isTempId } from "@/lib/optimistic-mutation";

type RenewalRow = Record<string, unknown> & {
  customer?: { companyName?: string };
};

export default function RenewalsPage() {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["renewals", page, pageSize],
    queryFn: async () => {
      const res = await api.get("/renewals", { params: { page, limit: pageSize } });
      return normalizePaginated<RenewalRow>(res.data);
    },
  });

  const rows = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Renewals"
        description="Domain, hosting, and service renewals."
        action={
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            + New Renewal
          </button>
        }
      />
      <GlassCard>
        {isLoading ? (
          <ListPageSkeleton rows={6} columns={4} />
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-sm text-red-500">Failed to load renewals</p>
            <button type="button" onClick={() => refetch()} className="mt-3 text-sm font-medium text-primary hover:underline">
              Retry
            </button>
          </div>
        ) : (
          <DataTable
            rows={rows}
            columns={[
              {
                key: "customer",
                label: "Customer",
                render: (row) => (
                  <Link href={`/renewals/${row.id}`} className="font-medium text-primary hover:underline">
                    {String(row.customer?.companyName ?? "—")}
                  </Link>
                ),
              },
              {
                key: "type",
                label: "Type",
                render: (row) => formatLabel(String(row.type ?? "—")),
              },
              {
                key: "renewalDate",
                label: "Renewal date",
                render: (row) => formatDate(row.renewalDate),
              },
              {
                key: "amount",
                label: "Amount",
                render: (row) => (row.amount != null ? formatMoney(row.amount) : "—"),
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
            ]}
          />
        )}
        {!isLoading && !error ? (
          <PaginationFooter
            page={page}
            totalPages={data?.totalPages ?? 1}
            totalCount={data?.totalCount ?? 0}
            limit={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              if (PAGE_SIZE_OPTIONS.includes(size as (typeof PAGE_SIZE_OPTIONS)[number])) {
                setPageSize(size);
                setPage(1);
              }
            }}
            className="px-4 pb-4"
          />
        ) : null}
      </GlassCard>
      <Modal open={showNew} onClose={() => setShowNew(false)} title="New renewal" size="lg">
        <RenewalForm
          onCancel={() => setShowNew(false)}
          onSuccess={(data) => {
            setShowNew(false);
            const id = String(data.id ?? "");
            if (id && !isTempId(id)) router.push(`/renewals/${id}`);
          }}
        />
      </Modal>
    </div>
  );
}
