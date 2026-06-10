"use client";

import { FormEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { appendToMatchingLists, createTempId, replaceMatchingListItemId } from "@/lib/optimistic-mutation";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { CustomerPickerField } from "@/components/ui/customer-picker-field";
import { FormField, SelectInput, TextArea, TextInput } from "@/components/ui/form-field";
import { FormFooterActions, FormShell } from "@/components/ui/form-shell";
import { FormSection } from "@/components/ui/form-section";
import { FileSpreadsheet } from "lucide-react";
import { QUOTATION_STATUSES } from "@/lib/types";

type LineItem = { name: string; qty: string; rate: string };

const emptyLineItem = (): LineItem => ({ name: "", qty: "1", rate: "" });

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function QuotationForm({
  leadId,
  defaultClientName,
  defaultClientEmail,
  onSuccess,
  onCancel,
}: {
  leadId?: string;
  defaultClientName?: string;
  defaultClientEmail?: string;
  onSuccess?: (data: Record<string, unknown>) => void;
  onCancel?: () => void;
}) {
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [gstRate, setGstRate] = useState("18");
  const [notes, setNotes] = useState("");
  const [clientName, setClientName] = useState(defaultClientName ?? "");
  const [clientEmail, setClientEmail] = useState(defaultClientEmail ?? "");
  const [status, setStatus] = useState("DRAFT");
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
      const payload = {
        lineItems: items,
        validUntil: new Date(validUntil).toISOString(),
        gstRate: gstRate ? Number(gstRate) : undefined,
        notes: notes.trim() || undefined,
        clientName: clientName.trim() || undefined,
        clientEmail: clientEmail.trim() || undefined,
        status,
        customerId: customerId || undefined,
      };
      const endpoint = leadId ? `/leads/${leadId}/quotations` : "/quotations";
      const res = await api.post(endpoint, payload);
      return res.data;
    },
    snapshotKeys: [["quotations"], ["lead", leadId ?? ""]],
    invalidateKeys: [["quotations"], ["lead", leadId ?? ""]],
    onMutate: () => {
      const tempId = createTempId();
      const optimistic = { id: tempId, status, clientName: clientName.trim() };
      appendToMatchingLists(queryClient, ["quotations"], optimistic);
      return { tempId };
    },
    onSuccess: (data, _vars, context) => {
      if (context?.tempId && data && typeof data === "object" && "id" in data) {
        replaceMatchingListItemId(
          queryClient,
          ["quotations"],
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
          : "Failed to create quotation";
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
    <form onSubmit={handleSubmit}>
      <FormShell footer={<FormFooterActions onCancel={onCancel} submitLabel="Create quotation" pending={mutation.isPending} pendingLabel="Creating…" />}>
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      ) : null}
      <FormSection title="Quote details" icon={FileSpreadsheet} accent="indigo">
      <div className="grid gap-4 sm:grid-cols-2">
        {!leadId ? (
          <div className="sm:col-span-2">
            <CustomerPickerField value={customerId} onChange={setCustomerId} />
          </div>
        ) : null}
        <FormField label="Client name">
          <TextInput value={clientName} onChange={setClientName} placeholder="Contact or company name" />
        </FormField>
        <FormField label="Client email">
          <TextInput value={clientEmail} onChange={setClientEmail} type="email" placeholder="For approval link" />
        </FormField>
        <FormField label="Valid until">
          <TextInput value={validUntil} onChange={setValidUntil} type="date" required />
        </FormField>
        <FormField label="GST rate (%)">
          <TextInput value={gstRate} onChange={setGstRate} type="number" />
        </FormField>
        <FormField label="Status">
          <SelectInput
            value={status}
            onChange={setStatus}
            options={QUOTATION_STATUSES.map((s) => ({ value: s, label: formatLabel(s) }))}
          />
        </FormField>
      </div>
      </FormSection>

      <FormSection title="Line items">
        <div className="-mt-1 mb-2 flex justify-end">
          <button
            type="button"
            onClick={() => setLineItems((prev) => [...prev, emptyLineItem()])}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
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
      </FormSection>

      <FormField label="Notes">
        <TextArea value={notes} onChange={setNotes} placeholder="Optional quotation notes" />
      </FormField>
      </FormShell>
    </form>
  );
}
