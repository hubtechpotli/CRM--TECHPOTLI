"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileImage } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate, formatLabel, formatMoney } from "@/lib/format";
import { GlassCard } from "@/components/ui/glass-card";
import { Modal } from "@/components/ui/modal";
import { PaymentForm } from "@/components/payments/payment-form";
import type { CustomerOption } from "@/components/ui/customer-picker-field";

type PaymentRow = Record<string, unknown> & {
  proofUrl?: string | null;
};

type PaymentsResponse = {
  items: PaymentRow[];
  total: number;
};

export function CustomerPaymentsPanel({
  customerId,
  customerName,
  customerPhone,
  customerEmail,
}: {
  customerId: string;
  customerName?: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
}) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const paymentsKey = ["payments", { customerId }] as const;

  const defaultCustomerOption = useMemo((): CustomerOption | undefined => {
    if (!customerName) return undefined;
    const sublabel = [customerPhone, customerEmail].filter(Boolean).join(" · ") || undefined;
    return {
      value: customerId,
      label: customerName,
      sublabel,
    };
  }, [customerId, customerName, customerPhone, customerEmail]);

  const { data, isLoading } = useQuery({
    queryKey: paymentsKey,
    queryFn: async () => {
      const res = await api.get<PaymentsResponse>("/payments", {
        params: { customerId, limit: 100 },
      });
      return res.data;
    },
  });

  const payments = useMemo(() => data?.items ?? [], [data?.items]);

  const { totalPaid, totalPending } = useMemo(() => {
    let paid = 0;
    let pending = 0;
    for (const p of payments) {
      paid += Number(p.paidAmount ?? 0);
      pending += Number(p.pendingAmount ?? 0);
    }
    return { totalPaid: paid, totalPending: pending };
  }, [payments]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-4 text-sm">
          <span>
            <span className="text-muted-foreground">Total collected:</span> ₹{totalPaid.toLocaleString("en-IN")}
          </span>
          <span>
            <span className="text-muted-foreground">Pending:</span> ₹{totalPending.toLocaleString("en-IN")}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          + Record collection
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading collections…</p>
      ) : (
        <GlassCard className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-4">Amount</th>
                <th className="pb-2 pr-4">Method</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Collected</th>
                <th className="pb-2 pr-4">Proof</th>
                <th className="pb-2">Reference</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={String(p.id)} className="border-b border-border/40">
                  <td className="py-2 pr-4">
                    <Link href={`/payments/${String(p.id)}`} className="font-medium text-primary hover:underline">
                      {formatMoney(p.paidAmount)}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{p.paymentMethod ? formatLabel(String(p.paymentMethod)) : "—"}</td>
                  <td className="py-2 pr-4">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs">
                      {formatLabel(String(p.status ?? ""))}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    {p.collectedAt ? formatDate(p.collectedAt) : p.createdAt ? formatDate(p.createdAt) : "—"}
                  </td>
                  <td className="py-2 pr-4">
                    {p.proofUrl ? (
                      <a
                        href={String(p.proofUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex text-primary hover:underline"
                        title="View proof"
                      >
                        <FileImage className="h-4 w-4" />
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2">{p.transactionId ? String(p.transactionId) : "—"}</td>
                </tr>
              ))}
              {!payments.length ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-muted-foreground">
                    No collections recorded
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </GlassCard>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Record collection">
        <PaymentForm
          defaultValues={{ customerId, status: "PAID" }}
          defaultCustomerOption={defaultCustomerOption}
          onCancel={() => setShowAdd(false)}
          onSuccess={() => {
            setShowAdd(false);
            void queryClient.invalidateQueries({ queryKey: paymentsKey });
            void queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
          }}
        />
      </Modal>
    </div>
  );
}
