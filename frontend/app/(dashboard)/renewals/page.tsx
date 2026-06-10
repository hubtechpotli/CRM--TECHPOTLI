"use client";

import { useState } from "react";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, normalizePaginated } from "@/lib/pagination";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate, formatLabel, formatMoney } from "@/lib/format";
import { CrmPageShell } from "@/components/dashboard/crm-page-shell";
import { SectionCard } from "@/components/dashboard/section-card";
import { Plus } from "lucide-react";
import { DataTable } from "@/components/dashboard/data-table";
import { ListPageSkeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import { RenewalForm } from "@/components/renewals/renewal-form";
import { isTempId } from "@/lib/optimistic-mutation";
import { useRouteColor } from "@/hooks/use-route-color";

type RenewalRow = Record<string, unknown> & {
  customer?: { companyName?: string };
};

export default function RenewalsPage() {
  const routeColor = useRouteColor();
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
    staleTime: 30_000,
  });

  const rows = data?.data ?? [];

  return (
    <CrmPageShell
      hideHeader
      title=""
      actions={
        <button type="button" onClick={() => setShowNew(true)} className={routeColor.btn}>
          <Plus className="h-3.5 w-3.5" />
          New Renewal
        </button>
      }
    >
      <SectionCard accent={routeColor}>
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
      </SectionCard>
      <Modal open={showNew} onOpenChange={setShowNew} title="New renewal" size="lg">
        <RenewalForm
          onCancel={() => setShowNew(false)}
          onSuccess={(data) => {
            setShowNew(false);
            const id = String(data.id ?? "");
            if (id && !isTempId(id)) router.push(`/renewals/${id}`);
          }}
        />
      </Modal>
    </CrmPageShell>
  );
}
