"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { GlassCard } from "@/components/ui/glass-card";
import { Modal } from "@/components/ui/modal";
import { FormField, SelectInput, TextInput } from "@/components/ui/form-field";
import { PAYMENT_STATUSES } from "@/lib/types";

type Payment = Record<string, unknown>;

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const emptyForm = {
  totalAmount: "",
  bookingAmount: "",
  paidAmount: "",
  status: "PENDING",
  dueDate: "",
  notes: "",
};

export function CustomerPaymentsPanel({ customerId }: { customerId: string }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["customer-payments", customerId],
    queryFn: async () => {
      const res = await api.get<Payment[]>(`/customers/${customerId}/payments`);
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/payments", {
        customerId,
        totalAmount: Number(form.totalAmount),
        bookingAmount: form.bookingAmount ? Number(form.bookingAmount) : undefined,
        paidAmount: form.paidAmount ? Number(form.paidAmount) : 0,
        status: form.status,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        notes: form.notes.trim() || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-payments", customerId] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      setShowAdd(false);
      setForm(emptyForm);
    },
  });

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.paidAmount ?? 0), 0);
  const totalPending = payments.reduce((sum, p) => sum + Number(p.pendingAmount ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-4 text-sm">
          <span><span className="text-muted-foreground">Total paid:</span> ₹{totalPaid.toLocaleString()}</span>
          <span><span className="text-muted-foreground">Total pending:</span> ₹{totalPending.toLocaleString()}</span>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          + Add payment
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading payments…</p>
      ) : (
        <GlassCard className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-4">Total</th>
                <th className="pb-2 pr-4">Booking</th>
                <th className="pb-2 pr-4">Paid</th>
                <th className="pb-2 pr-4">Pending</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2">Due</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={String(p.id)} className="border-b border-border/40">
                  <td className="py-2 pr-4">₹{String(p.totalAmount ?? 0)}</td>
                  <td className="py-2 pr-4">{p.bookingAmount != null ? `₹${p.bookingAmount}` : "—"}</td>
                  <td className="py-2 pr-4">₹{String(p.paidAmount ?? 0)}</td>
                  <td className="py-2 pr-4">₹{String(p.pendingAmount ?? 0)}</td>
                  <td className="py-2 pr-4">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs">{formatLabel(String(p.status ?? ""))}</span>
                  </td>
                  <td className="py-2">{p.dueDate ? new Date(String(p.dueDate)).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
              {!payments.length ? (
                <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">No payments recorded</td></tr>
              ) : null}
            </tbody>
          </table>
        </GlassCard>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add payment">
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
          <FormField label="Total amount (₹)">
            <TextInput value={form.totalAmount} onChange={(v) => setForm((f) => ({ ...f, totalAmount: v }))} type="number" required />
          </FormField>
          <FormField label="Booking amount (₹)">
            <TextInput value={form.bookingAmount} onChange={(v) => setForm((f) => ({ ...f, bookingAmount: v }))} type="number" />
          </FormField>
          <FormField label="Paid amount (₹)">
            <TextInput value={form.paidAmount} onChange={(v) => setForm((f) => ({ ...f, paidAmount: v }))} type="number" />
          </FormField>
          <FormField label="Status">
            <SelectInput
              value={form.status}
              onChange={(v) => setForm((f) => ({ ...f, status: v }))}
              options={PAYMENT_STATUSES.map((s) => ({ value: s, label: formatLabel(s) }))}
            />
          </FormField>
          <FormField label="Due date">
            <TextInput value={form.dueDate} onChange={(v) => setForm((f) => ({ ...f, dueDate: v }))} type="date" />
          </FormField>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border border-border px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {createMutation.isPending ? "Saving…" : "Add payment"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
