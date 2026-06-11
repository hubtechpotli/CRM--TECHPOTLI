"use client";

import { FormEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { appendToMatchingLists, createTempId, replaceMatchingListItemId } from "@/lib/optimistic-mutation";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { formatLabel } from "@/lib/format";
import { RENEWAL_TYPES } from "@/lib/types";
import { FormField, SelectInput, TextArea, TextInput } from "@/components/ui/form-field";
import { CustomerPickerField } from "@/components/ui/customer-picker-field";

export function RenewalForm({
  onSuccess,
  onCancel,
}: {
  onSuccess?: (data: Record<string, unknown>) => void;
  onCancel?: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    customerId: "",
    type: "DOMAIN",
    renewalDate: "",
    amount: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useOptimisticMutation({
    mutationFn: async () => {
      const res = await api.post("/renewals", {
        customerId: form.customerId,
        type: form.type,
        renewalDate: new Date(form.renewalDate).toISOString(),
        amount: form.amount ? Number(form.amount) : undefined,
        notes: form.notes.trim() || undefined,
      });
      return res.data;
    },
    snapshotKeys: [["renewals"]],
    invalidateKeys: [["renewals"]],
    onMutate: () => {
      const tempId = createTempId();
      const optimistic = {
        id: tempId,
        customerId: form.customerId,
        type: form.type,
        renewalDate: form.renewalDate,
      };
      appendToMatchingLists(queryClient, ["renewals"], optimistic);
      return { tempId };
    },
    onSuccess: (data, _vars, context) => {
      if (context?.tempId && data && typeof data === "object" && "id" in data) {
        replaceMatchingListItemId(
          queryClient,
          ["renewals"],
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
        : "Failed to create renewal";
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
        <div className="sm:col-span-2">
          <CustomerPickerField
            value={form.customerId}
            onChange={(v) => setForm((f) => ({ ...f, customerId: v }))}
            label="Customer"
            required
          />
        </div>
        <FormField label="Type">
          <SelectInput
            value={form.type}
            onChange={(v) => setForm((f) => ({ ...f, type: v }))}
            options={RENEWAL_TYPES.map((t) => ({ value: t, label: formatLabel(t) }))}
          />
        </FormField>
        <FormField label="Renewal date">
          <TextInput value={form.renewalDate} onChange={(v) => setForm((f) => ({ ...f, renewalDate: v }))} type="date" required />
        </FormField>
        <FormField label="Amount (₹)" className="sm:col-span-2">
          <TextInput value={form.amount} onChange={(v) => setForm((f) => ({ ...f, amount: v }))} type="number" placeholder="Optional" />
        </FormField>
        <FormField label="Notes" className="sm:col-span-2">
          <TextArea value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} />
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
          {mutation.isPending ? "Saving…" : "Create renewal"}
        </button>
      </div>
    </form>
  );
}
