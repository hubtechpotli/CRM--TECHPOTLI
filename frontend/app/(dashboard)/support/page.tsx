"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate, formatLabel } from "@/lib/format";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable } from "@/components/dashboard/data-table";

type TicketRow = Record<string, unknown>;

export default function SupportPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["support-tickets"],
    queryFn: async () => {
      const res = await api.get<TicketRow[]>("/support/tickets");
      return res.data;
    },
  });

  const rows = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Support" description="Customer support tickets and requests." />
      <GlassCard>
        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-sm text-red-500">Failed to load tickets</p>
            <button type="button" onClick={() => refetch()} className="mt-3 text-sm font-medium text-primary hover:underline">
              Retry
            </button>
          </div>
        ) : (
          <DataTable
            rows={rows}
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
      </GlassCard>
    </div>
  );
}
