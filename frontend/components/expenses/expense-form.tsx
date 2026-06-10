"use client";

import { FormEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { appendToMatchingLists, createTempId, replaceMatchingListItemId } from "@/lib/optimistic-mutation";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { formatLabel } from "@/lib/format";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/types";
import { FormField, SelectInput, TextArea, TextInput } from "@/components/ui/form-field";

export function ExpenseForm({
  onSuccess,
  onCancel,
}: {
  onSuccess?: (data: Record<string, unknown>) => void;
  onCancel?: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    category: "OTHER",
    description: "",
    amount: "",
    date: "",
    vendor: "",
    paymentMethod: "",
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useOptimisticMutation({
    mutationFn: async () => {
      const res = await api.post("/expenses", {
        category: form.category,
        description: form.description.trim(),
        amount: Number(form.amount),
        date: new Date(form.date).toISOString(),
        vendor: form.vendor.trim() || undefined,
        paymentMethod: form.paymentMethod || undefined,
      });
      return res.data;
    },
    snapshotKeys: [["expenses"]],
    invalidateKeys: [["expenses"]],
    onMutate: () => {
      const tempId = createTempId();
      const optimistic = {
        id: tempId,
        category: form.category,
        description: form.description.trim(),
        amount: Number(form.amount),
        date: form.date,
        status: "PENDING",
      };
      appendToMatchingLists(queryClient, ["expenses"], optimistic);
      return { tempId };
    },
    onSuccess: (data, _vars, context) => {
      if (context?.tempId && data && typeof data === "object" && "id" in data) {
        replaceMatchingListItemId(
          queryClient,
          ["expenses"],
          context.tempId,
          data as { id: string },
        );
      }
      if (data && typeof data === "object") {
        onSuccess?.(data as Record<string, unknown>);
      }
    },
    onError: (err) => {
      const message = isAxiosError(err)
        ? (err.response?.data as { message?: string | string[] })?.message ?? err.message
        : "Failed to create expense";
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
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Category">
          <SelectInput
            value={form.category}
            onChange={(v) => setForm((f) => ({ ...f, category: v }))}
            options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: formatLabel(c) }))}
          />
        </FormField>
        <FormField label="Date">
          <TextInput value={form.date} onChange={(v) => setForm((f) => ({ ...f, date: v }))} type="date" required />
        </FormField>
        <FormField label="Amount (₹)" className="sm:col-span-2">
          <TextInput value={form.amount} onChange={(v) => setForm((f) => ({ ...f, amount: v }))} type="number" required />
        </FormField>
        <FormField label="Vendor" className="sm:col-span-2">
          <TextInput value={form.vendor} onChange={(v) => setForm((f) => ({ ...f, vendor: v }))} placeholder="Optional" />
        </FormField>
        <FormField label="Payment method" className="sm:col-span-2">
          <SelectInput
            value={form.paymentMethod}
            onChange={(v) => setForm((f) => ({ ...f, paymentMethod: v }))}
            placeholder="Optional"
            options={PAYMENT_METHODS.map((m) => ({ value: m, label: formatLabel(m) }))}
          />
        </FormField>
        <FormField label="Description" className="sm:col-span-2">
          <TextArea value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} required />
        </FormField>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        {onCancel ? (
          <button type="button" onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="crm-btn-primary disabled:opacity-60"
        >
          {mutation.isPending ? "Saving…" : "Create expense"}
        </button>
      </div>
    </form>
  );
}
