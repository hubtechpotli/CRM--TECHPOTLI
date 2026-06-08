"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate, formatLabel, formatMoney } from "@/lib/format";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/dashboard/page-header";

type RenewalDetail = Record<string, unknown> & {
  customer?: { companyName?: string; phone?: string; email?: string };
};

export default function RenewalDetailPage() {
  const params = useParams();
  const id = String(params.id);

  const { data, isLoading, error } = useQuery({
    queryKey: ["renewal", id],
    queryFn: async () => {
      const res = await api.get<RenewalDetail>(`/renewals/${id}`);
      return res.data;
    },
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading renewal…</p>;
  }
  if (error || !data) {
    return <p className="text-sm text-red-500">Renewal not found</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={formatLabel(String(data.type ?? "Renewal"))}
        description={`${data.customer?.companyName ?? "Customer"} · ${formatLabel(String(data.status ?? "—"))}`}
        action={
          <Link href="/renewals" className="text-sm text-primary hover:underline">
            ← Back to renewals
          </Link>
        }
      />
      <GlassCard>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Customer</dt>
            <dd>{data.customer?.companyName ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Type</dt>
            <dd>{formatLabel(String(data.type ?? "—"))}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Renewal date</dt>
            <dd>{formatDate(data.renewalDate)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Amount</dt>
            <dd>{data.amount != null ? formatMoney(data.amount) : "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Status</dt>
            <dd>{formatLabel(String(data.status ?? "—"))}</dd>
          </div>
          {data.notes ? (
            <div className="border-t border-border/40 pt-3">
              <dt className="text-muted-foreground">Notes</dt>
              <dd className="mt-1">{String(data.notes)}</dd>
            </div>
          ) : null}
        </dl>
      </GlassCard>
    </div>
  );
}
