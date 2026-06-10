"use client";

import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { appendToMatchingLists, createTempId, replaceMatchingListItemId } from "@/lib/optimistic-mutation";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { FormField, SelectInput, TextArea, TextInput } from "@/components/ui/form-field";

type LineItem = { name: string; qty: string; rate: string };

const emptyLineItem = (): LineItem => ({ name: "", qty: "1", rate: "" });

export function InvoiceForm({
  onSuccess,
  onCancel,
}: {
  onSuccess?: (data: Record<string, unknown>) => void;
  onCancel?: () => void;
}) {
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [gstRate, setGstRate] = useState("18");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLineItem()]);
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

  const mutation = useOptimisticMutation({
    mutationFn: async () => {
      const items = lineItems
        .filter((i) => i.name.trim())
        .map((i) => {
          const qty = Number(i.qty) || 1;
          const rate = Number(i.rate) || 0;
          return { name: i.name.trim(), qty, rate, amount: qty * rate };
        });
      if (!items.length) throw new Error("Add at least one line item");
      const res = await api.post("/invoices", {
        customerId,
        dueDate: new Date(dueDate).toISOString(),
        gstRate: gstRate ? Number(gstRate) : undefined,
        notes: notes.trim() || undefined,
        lineItems: items,
      });
      return res.data;
    },
    snapshotKeys: [["invoices"]],
    invalidateKeys: [["invoices"]],
    onMutate: () => {
      const tempId = createTempId();
      const optimistic = { id: tempId, customerId, status: "DRAFT", dueDate };
      appendToMatchingLists(queryClient, ["invoices"], optimistic);
      return { tempId };
    },
    onSuccess: (data, _vars, context) => {
      if (context?.tempId && data && typeof data === "object" && "id" in data) {
        replaceMatchingListItemId(
          queryClient,
          ["invoices"],
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
        : err instanceof Error
          ? err.message
          : "Failed to create invoice";
      setError(Array.isArray(message) ? message.join(", ") : String(message));
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  }

  function updateLineItem(index: number, key: keyof LineItem, value: string) {
    setLineItems((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Customer" className="sm:col-span-2">
          <SelectInput
            value={customerId}
            onChange={setCustomerId}
            placeholder="Select customer"
            required
            options={customers.map((c) => ({
              value: String(c.id),
              label: String(c.companyName ?? c.id),
            }))}
          />
        </FormField>
        <FormField label="Due date">
          <TextInput value={dueDate} onChange={setDueDate} type="date" required />
        </FormField>
        <FormField label="GST rate (%)">
          <TextInput value={gstRate} onChange={setGstRate} type="number" />
        </FormField>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Line items</span>
          <button
            type="button"
            onClick={() => setLineItems((prev) => [...prev, emptyLineItem()])}
            className="text-xs font-medium text-primary hover:underline"
          >
            + Add item
          </button>
        </div>
        {lineItems.map((item, index) => (
          <div key={index} className="grid gap-2 rounded-lg border border-border/60 p-3 sm:grid-cols-4">
            <FormField label={index === 0 ? "Description" : ""} className="sm:col-span-2">
              <TextInput
                value={item.name}
                onChange={(v) => updateLineItem(index, "name", v)}
                placeholder="Service or product"
                required={index === 0}
              />
            </FormField>
            <FormField label={index === 0 ? "Qty" : ""}>
              <TextInput value={item.qty} onChange={(v) => updateLineItem(index, "qty", v)} type="number" />
            </FormField>
            <FormField label={index === 0 ? "Rate (₹)" : ""}>
              <div className="flex gap-1">
                <TextInput value={item.rate} onChange={(v) => updateLineItem(index, "rate", v)} type="number" />
                {lineItems.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setLineItems((prev) => prev.filter((_, i) => i !== index))}
                    className="shrink-0 rounded-lg border border-border px-2 text-xs text-red-600"
                  >
                    ×
                  </button>
                ) : null}
              </div>
            </FormField>
          </div>
        ))}
      </div>

      <FormField label="Notes">
        <TextArea value={notes} onChange={setNotes} placeholder="Optional invoice notes" />
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
          {mutation.isPending ? "Creating…" : "Create invoice"}
        </button>
      </div>
    </form>
  );
}
