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
import { Modal } from "@/components/ui/modal";
import { ListPageSkeleton } from "@/components/ui/skeleton";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { isTempId } from "@/lib/optimistic-mutation";
import { usePathname } from "next/navigation";
import { getRouteColor } from "@/lib/nav-colors";

type InvoiceRow = Record<string, unknown> & {
  customer?: { companyName?: string };
};

export default function InvoicesPage() {
  const pathname = usePathname();
  const routeColor = getRouteColor(pathname);
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["invoices", page, pageSize],
    queryFn: async () => {
      const res = await api.get("/invoices", { params: { page, limit: pageSize } });
      return normalizePaginated<InvoiceRow>(res.data);
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
          New Invoice
        </button>
      }
    >
      <SectionCard accent={routeColor}>
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
      <Modal open={showNew} onOpenChange={setShowNew} title="New invoice" description="Bill a customer for services" size="lg" accent="indigo">
        <InvoiceForm
          onCancel={() => setShowNew(false)}
          onSuccess={(data) => {
            setShowNew(false);
            const id = String(data.id ?? "");
            if (id && !isTempId(id)) router.push(`/invoices/${id}`);
          }}
        />
      </Modal>
    </CrmPageShell>
  );
}
