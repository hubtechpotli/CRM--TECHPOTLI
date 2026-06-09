"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { formatDate, formatLabel, formatMoney } from "@/lib/format";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/dashboard/page-header";

type LineItem = { name: string; qty: number; rate: number; amount: number };

type InvoiceDetail = Record<string, unknown> & {
  customer?: { companyName?: string; email?: string };
  lineItems?: LineItem[];
  pdfViewUrl?: string | null;
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const res = await api.get<InvoiceDetail>(`/invoices/${id}`);
      return res.data;
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/invoices/${id}/send`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  const regeneratePdfMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/invoices/${id}/regenerate-pdf`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
    },
  });

  if (isLoading) {
    return <div className="space-y-6"><div className="h-8 w-48 animate-pulse rounded bg-muted" /><div className="h-64 animate-pulse rounded-2xl border border-border/60 bg-card" /></div>;
  }
  if (error || !data) {
    return <p className="text-sm text-red-500">Invoice not found</p>;
  }

  const lineItems = Array.isArray(data.lineItems) ? data.lineItems : [];
  const mutationError = sendMutation.isError
    ? isAxiosError(sendMutation.error)
      ? (() => {
          const data = sendMutation.error.response?.data as { message?: string | string[] };
          const msg = data?.message;
          if (Array.isArray(msg)) return msg.join(", ");
          if (typeof msg === "string" && msg) return msg;
          return sendMutation.error.message || "Failed to send invoice";
        })()
      : "Failed to send invoice"
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={String(data.invoiceNumber ?? "Invoice")}
        description={`${data.customer?.companyName ?? "Customer"} · ${formatLabel(String(data.status ?? "—"))}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (sendMutation.isPending) return;
                sendMutation.mutate();
              }}
              disabled={sendMutation.isPending || !data.customer?.email}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
              title={!data.customer?.email ? "Add customer email first" : undefined}
            >
              {sendMutation.isPending
                ? "Sending…"
                : data.status === "SENT"
                  ? "Resend invoice"
                  : "Send invoice"}
            </button>
            {data.pdfViewUrl ? (
              <a
                href={String(data.pdfViewUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                View PDF
              </a>
            ) : (
              <button
                type="button"
                onClick={() => regeneratePdfMutation.mutate()}
                disabled={regeneratePdfMutation.isPending}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60"
              >
                {regeneratePdfMutation.isPending ? "Generating…" : "Generate PDF"}
              </button>
            )}
            <Link href="/invoices" className="text-sm text-primary hover:underline">
              ← Back to invoices
            </Link>
          </div>
        }
      />

      {mutationError ? (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{mutationError}</p>
      ) : null}
      {!data.customer?.email ? (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
          Add a customer email on the customer profile before sending this invoice.
        </p>
      ) : null}
      {sendMutation.isSuccess ? (
        <p className="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
          Invoice sent successfully.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <h3 className="mb-3 text-sm font-semibold">Summary</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Customer</dt>
              <dd>{data.customer?.companyName ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Email</dt>
              <dd>{data.customer?.email ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Invoice date</dt>
              <dd>{formatDate(data.invoiceDate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Due date</dt>
              <dd>{formatDate(data.dueDate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatMoney(data.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">GST ({String(data.gstRate ?? 0)}%)</dt>
              <dd>{formatMoney(data.gstAmount)}</dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>Grand total</dt>
              <dd>{formatMoney(data.grandTotal)}</dd>
            </div>
          </dl>
          {data.notes ? (
            <div className="mt-4 border-t border-border/40 pt-3">
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="mt-1 text-sm">{String(data.notes)}</p>
            </div>
          ) : null}
        </GlassCard>

        <GlassCard>
          <h3 className="mb-3 text-sm font-semibold">Line items</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4">Item</th>
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
                    <td className="py-2 pr-4">{formatMoney(item.rate)}</td>
                    <td className="py-2">{formatMoney(item.amount)}</td>
                  </tr>
                ))}
                {!lineItems.length ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-muted-foreground">
                      No line items
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
