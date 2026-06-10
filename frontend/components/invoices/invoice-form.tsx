"use client";

import { FormEvent, useState } from "react";
import { FileText, Receipt } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { appendToMatchingLists, createTempId, replaceMatchingListItemId } from "@/lib/optimistic-mutation";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { CustomerPickerField } from "@/components/ui/customer-picker-field";
import { FormField, TextArea, TextInput } from "@/components/ui/form-field";
import { FormFooterActions, FormShell } from "@/components/ui/form-shell";
import { FormSection } from "@/components/ui/form-section";

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
      appendToMatchingLists(queryClient, ["invoices"], { id: tempId, customerId, status: "DRAFT", dueDate });
      return { tempId };
    },
    onSuccess: (data, _vars, context) => {
      if (context?.tempId && data && typeof data === "object" && "id" in data) {
        replaceMatchingListItemId(queryClient, ["invoices"], context.tempId, data as { id: string });
      }
      if (data && typeof data === "object") onSuccess?.(data as Record<string, unknown>);
    },
    onError: (err) => {
      const message = isAxiosError(err)
        ? (err.response?.data as { message?: string | string[] })?.message ?? err.message
        : err instanceof Error ? err.message : "Failed to create invoice";
      setError(Array.isArray(message) ? message.join(", ") : String(message));
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!customerId) {
      setError("Please select a customer");
      return;
    }
    mutation.mutate();
  }

  function updateLineItem(index: number, key: keyof LineItem, value: string) {
    setLineItems((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormShell
        footer={
          <FormFooterActions onCancel={onCancel} submitLabel="Create invoice" pending={mutation.isPending} pendingLabel="Creating…" />
        }
      >
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        ) : null}

        <FormSection title="Bill to" description="Customer and due date" icon={FileText} accent="indigo">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <CustomerPickerField value={customerId} onChange={setCustomerId} required />
            </div>
            <FormField label="Due date">
              <TextInput value={dueDate} onChange={setDueDate} type="date" required />
            </FormField>
            <FormField label="GST rate (%)">
              <TextInput value={gstRate} onChange={setGstRate} type="number" />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Line items" icon={Receipt} accent="cyan">
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={() => setLineItems((prev) => [...prev, emptyLineItem()])}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              + Add item
            </button>
          </div>
          <div className="space-y-2">
            {lineItems.map((item, index) => (
              <div key={index} className="grid gap-2 rounded-xl border border-white/60 bg-white/70 p-3 shadow-sm sm:grid-cols-4">
                <FormField label={index === 0 ? "Description" : ""} className="sm:col-span-2">
                  <TextInput value={item.name} onChange={(v) => updateLineItem(index, "name", v)} placeholder="Service or product" required={index === 0} />
                </FormField>
                <FormField label={index === 0 ? "Qty" : ""}>
                  <TextInput value={item.qty} onChange={(v) => updateLineItem(index, "qty", v)} type="number" />
                </FormField>
                <FormField label={index === 0 ? "Rate (₹)" : ""}>
                  <div className="flex gap-1">
                    <TextInput value={item.rate} onChange={(v) => updateLineItem(index, "rate", v)} type="number" />
                    {lineItems.length > 1 ? (
                      <button type="button" onClick={() => setLineItems((prev) => prev.filter((_, i) => i !== index))} className="shrink-0 rounded-lg border border-red-200 px-2 text-xs text-red-600">
                        ×
                      </button>
                    ) : null}
                  </div>
                </FormField>
              </div>
            ))}
          </div>
        </FormSection>

        <FormField label="Notes">
          <TextArea value={notes} onChange={setNotes} placeholder="Optional invoice notes" />
        </FormField>
      </FormShell>
    </form>
  );
}
