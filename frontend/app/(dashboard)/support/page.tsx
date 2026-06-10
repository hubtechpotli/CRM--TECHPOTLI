"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { LifeBuoy } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { formatDate, formatLabel } from "@/lib/format";
import { CrmPageShell } from "@/components/dashboard/crm-page-shell";
import { SectionCard } from "@/components/dashboard/section-card";
import { DataTable } from "@/components/dashboard/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ListPageSkeleton } from "@/components/ui/skeleton";
import { useRouteColor } from "@/hooks/use-route-color";

type TicketRow = Record<string, unknown>;

export default function SupportPage() {
  const routeColor = useRouteColor();
  const { authReady } = useAuthReady();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["support-tickets"],
    queryFn: async () => {
      const res = await api.get<TicketRow[]>("/support/tickets");
      return res.data;
    },
    enabled: authReady,
    staleTime: 30_000,
  });

  const rows = Array.isArray(data) ? data : [];

  return (
    <CrmPageShell hideHeader title="">
      <SectionCard noPadding accent={routeColor} className="p-4">
        {isLoading ? (
          <ListPageSkeleton rows={6} columns={4} />
        ) : error ? (
          <div className="py-10 text-center">
            <p className="text-sm text-red-500">Failed to load tickets</p>
            <button type="button" onClick={() => refetch()} className="mt-3 text-sm font-medium text-primary hover:underline">
              Retry
            </button>
          </div>
        ) : (
          <DataTable
            rows={rows}
            emptyState={
              <EmptyState
                icon={LifeBuoy}
                title="No support tickets"
                description="Customer support requests will appear here."
              />
            }
            columns={[
              {
                key: "subject",
                label: "Subject",
                render: (row) => (
                  <Link href={`/support/${row.id}`} className="font-medium text-primary hover:underline">
                    {String(row.subject ?? "—")}
                  </Link>
                ),
              },
              {
                key: "priority",
                label: "Priority",
                render: (row) => formatLabel(String(row.priority ?? "—")),
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
                key: "createdAt",
                label: "Created",
                render: (row) => formatDate(row.createdAt),
              },
            ]}
          />
        )}
      </SectionCard>
    </CrmPageShell>
  );
}
