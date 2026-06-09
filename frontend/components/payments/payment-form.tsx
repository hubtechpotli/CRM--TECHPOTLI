"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { formatLabel } from "@/lib/format";
import { PAYMENT_STATUSES } from "@/lib/types";
import { FormField, SelectInput, TextInput } from "@/components/ui/form-field";

export function PaymentForm({
  onSuccess,
  onCancel,
}: {
  onSuccess?: (data: Record<string, unknown>) => void;
  onCancel?: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    customerId: "",
    totalAmount: "",
    bookingAmount: "",
    paidAmount: "",
    status: "PENDING",
    dueDate: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-directory", { q: undefined }],
    queryFn: async () => {
      const data = await import("@/lib/customers-directory").then((m) =>
        m.fetchCustomersDirectory({ limit: 500 }),
      );
      return data.items;
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/payments", {
        customerId: form.customerId,
        totalAmount: Number(form.totalAmount),
        bookingAmount: form.bookingAmount ? Number(form.bookingAmount) : undefined,
        paidAmount: form.paidAmount ? Number(form.paidAmount) : 0,
        status: form.status,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        notes: form.notes.trim() || undefined,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      onSuccess?.(data);
    },
    onError: (err) => {
      const message = isAxiosError(err)
        ? (err.response?.data as { message?: string | string[] })?.message ?? err.message
        : "Failed to create payment";
      setError(Array.isArray(message) ? message.join(", ") : String(message));
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <FormField label="Customer">
        <SelectInput
          value={form.customerId}
          onChange={(v) => setForm((f) => ({ ...f, customerId: v }))}
          placeholder="Select customer"
          required
          options={customers.map((c) => ({
            value: String(c.id),
            label: String(c.companyName ?? c.id),
          }))}
        />
      </FormField>
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
      <div className="flex justify-end gap-2 pt-2">
        {onCancel ? (
          <button type="button" onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-indigo-600 disabled:opacity-60"
        >
          {mutation.isPending ? "Saving…" : "Create payment"}
        </button>
      </div>
    </form>
  );
}
