"use client";

import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { patchDetailItem, isTempId } from "@/lib/optimistic-mutation";
import Link from "next/link";
import { api } from "@/lib/api";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { CustomerDetailSkeleton } from "@/components/ui/skeleton";
import { SelectInput } from "@/components/ui/form-field";
import { QUOTATION_STATUSES } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/format";

type QuotationDetail = Record<string, unknown> & {
  lineItems?: Array<{ name: string; qty: number; rate: number; amount: number }>;
  lead?: { id?: string; companyName?: string };
  customer?: { id?: string; companyName?: string };
  createdBy?: { name?: string };
};

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function QuotationDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["quotation", id],
    queryFn: async () => {
      const res = await api.get<QuotationDetail>(`/quotations/${id}`);
      return res.data;
    },
    enabled: !isTempId(id),
  });

  const quotationKey = ["quotation", id] as const;

  const statusMutation = useOptimisticMutation({
    mutationFn: async (status: string) => {
      const res = await api.patch(`/quotations/${id}`, { status });
      return res.data;
    },
    snapshotKeys: [quotationKey],
    invalidateKeys: [quotationKey, ["quotations"]],
    onMutate: (status) => {
      patchDetailItem(queryClient, quotationKey, { status });
    },
  });

  async function copyApprovalLink() {
    if (!data?.approvalToken) return;
    const url = `${window.location.origin}/quote/approve/${data.approvalToken}`;
    await navigator.clipboard.writeText(url);
  }

  if (isTempId(id)) {
    return <p className="text-sm text-muted-foreground">Saving new quotation…</p>;
  }

  if (isLoading) {
    return <CustomerDetailSkeleton />;
  }
  if (error || !data) {
    return <p className="text-sm text-red-500">Quotation not found</p>;
  }

  const lineItems = (data.lineItems as QuotationDetail["lineItems"]) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={String(data.quotationNumber ?? "Quotation")}
        description={`${formatLabel(String(data.status ?? "—"))} · ₹${String(data.grandTotal ?? 0)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copyApprovalLink}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              Copy approval link
            </button>
            <Link href="/quotations" className="text-sm text-primary hover:underline">
              ← Back to quotations
            </Link>
          </div>
        }
      />

      <GlassCard className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium text-muted-foreground">Update status:</span>
        <SelectInput
          value={String(data.status ?? "")}
          onChange={(v) => v && statusMutation.mutate(v)}
          options={QUOTATION_STATUSES.map((s) => ({ value: s, label: formatLabel(s) }))}
        />
        {statusMutation.isPending ? <span className="text-xs text-muted-foreground">Updating…</span> : null}
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <h3 className="mb-3 text-sm font-semibold">Client</h3>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between gap-x-4">
              <dt className="shrink-0 text-muted-foreground">Name</dt>
              <dd className="min-w-0 text-right">
                {String(data.clientName ?? data.lead?.companyName ?? data.customer?.companyName ?? "—")}
              </dd>
            </div>
            <div className="flex justify-between gap-x-4">
              <dt className="shrink-0 text-muted-foreground">Email</dt>
              <dd className="min-w-0 text-right">{String(data.clientEmail ?? "—")}</dd>
            </div>
            {data.lead?.id ? (
              <div className="flex justify-between gap-x-4">
                <dt className="shrink-0 text-muted-foreground">Lead</dt>
                <dd className="min-w-0 text-right">
                  <Link href={`/leads/${data.lead.id}`} className="text-primary hover:underline">
                    {data.lead.companyName}
                  </Link>
                </dd>
              </div>
            ) : null}
            {data.customer?.id ? (
              <div className="flex justify-between gap-x-4">
                <dt className="shrink-0 text-muted-foreground">Customer</dt>
                <dd className="min-w-0 text-right">
                  <Link href={`/customers/${data.customer.id}`} className="text-primary hover:underline">
                    {data.customer.companyName}
                  </Link>
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-x-4">
              <dt className="shrink-0 text-muted-foreground">Valid until</dt>
              <dd className="min-w-0 text-right">{data.validUntil ? formatDate(data.validUntil) : "—"}</dd>
            </div>
            <div className="flex justify-between gap-x-4">
              <dt className="shrink-0 text-muted-foreground">Created by</dt>
              <dd className="min-w-0 text-right">{data.createdBy?.name ?? "—"}</dd>
            </div>
          </dl>
        </GlassCard>

        <GlassCard>
          <h3 className="mb-3 text-sm font-semibold">Totals</h3>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between gap-x-4">
              <dt className="shrink-0 text-muted-foreground">Subtotal</dt>
              <dd className="min-w-0 text-right">₹{String(data.subtotal ?? 0)}</dd>
            </div>
            <div className="flex justify-between gap-x-4">
              <dt className="shrink-0 text-muted-foreground">GST</dt>
              <dd className="min-w-0 text-right">₹{String(data.gstAmount ?? 0)}</dd>
            </div>
            <div className="flex justify-between gap-x-4 font-semibold">
              <dt className="shrink-0">Grand total</dt>
              <dd className="min-w-0 text-right">₹{String(data.grandTotal ?? 0)}</dd>
            </div>
            {data.approvedAt ? (
              <div className="flex justify-between gap-x-4">
                <dt className="shrink-0 text-muted-foreground">Approved</dt>
                <dd className="min-w-0 text-right">{formatDateTime(data.approvedAt)}</dd>
              </div>
            ) : null}
          </dl>
        </GlassCard>

        <GlassCard className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold">Line items</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4">Description</th>
                  <th className="pb-2 pr-4">Qty</th>
                  <th className="pb-2 pr-4">Rate</th>
                  <th className="pb-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, i) => (
                  <tr key={i} className="border-b border-border/40">
                    <td className="py-2 pr-4">{item.name}</td>
                    <td className="py-2 pr-4">{item.qty}</td>
                    <td className="py-2 pr-4">₹{item.rate}</td>
                    <td className="py-2">₹{item.amount}</td>
                  </tr>
                ))}
                {!lineItems.length ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-muted-foreground">
                      No line items
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {data.notes ? (
            <div className="mt-4 border-t border-border/40 pt-3">
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="mt-1 text-sm">{String(data.notes)}</p>
            </div>
          ) : null}
        </GlassCard>
      </div>
    </div>
  );
}
