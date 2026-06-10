"use client";

import { FormEvent, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { useFormDraft } from "@/hooks/use-form-draft";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatLabel } from "@/lib/format";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "@/lib/types";
import { FormField, SelectInput, TextArea, TextInput } from "@/components/ui/form-field";
import { Upload, X } from "lucide-react";

type PaymentFormData = {
  customerId: string;
  invoiceId: string;
  paidAmount: string;
  totalAmount: string;
  status: string;
  paymentMethod: string;
  transactionId: string;
  notes: string;
  collectedAt: string;
};

const emptyForm: PaymentFormData = {
  customerId: "",
  invoiceId: "",
  paidAmount: "",
  totalAmount: "",
  status: "PAID",
  paymentMethod: "UPI",
  transactionId: "",
  notes: "",
  collectedAt: new Date().toISOString().slice(0, 10),
};

export function PaymentForm({
  defaultValues,
  onSuccess,
  onCancel,
}: {
  defaultValues?: Partial<PaymentFormData>;
  onSuccess?: (data: Record<string, unknown>) => void;
  onCancel?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [proof, setProof] = useState<{ key: string; filename: string; mimeType: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const initial = { ...emptyForm, ...defaultValues };
  const draftScope =
    defaultValues?.invoiceId ?? defaultValues?.customerId ?? "general";
  const { form, setForm, restored, dirty, clearDraft, discardDraft } = useFormDraft({
    draftKey: `payment:new:${draftScope}`,
    initial,
    enabled: !defaultValues?.invoiceId && !defaultValues?.customerId,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-directory", { q: undefined }],
    queryFn: async () => {
      const data = await import("@/lib/customers-directory").then((m) =>
        m.fetchCustomersDirectory({ limit: 500 }),
      );
      return data.items;
    },
  });

  async function handleProofFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post<{ key: string; filename: string }>("/uploads", formData);
      setProof({
        key: res.data.key,
        filename: res.data.filename ?? file.name,
        mimeType: file.type,
      });
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to upload proof"));
    } finally {
      setUploading(false);
    }
  }

  const mutation = useOptimisticMutation({
    mutationFn: async () => {
      const paid = Number(form.paidAmount);
      const total = form.totalAmount ? Number(form.totalAmount) : paid;
      const res = await api.post("/payments", {
        customerId: form.customerId,
        invoiceId: form.invoiceId || undefined,
        paidAmount: paid,
        totalAmount: total,
        status: form.status,
        paymentMethod: form.paymentMethod || undefined,
        transactionId: form.transactionId.trim() || undefined,
        notes: form.notes.trim() || undefined,
        collectedAt: form.collectedAt ? new Date(form.collectedAt).toISOString() : undefined,
        proofS3Key: proof?.key,
        proofFilename: proof?.filename,
        proofMimeType: proof?.mimeType,
      });
      return res.data;
    },
    invalidateKeys: [["payments"], ["payments-summary"]],
    onSuccess: (data) => {
      clearDraft();
      onSuccess?.(data as Record<string, unknown>);
    },
    onError: (err) => {
      setError(getApiErrorMessage(err, "Failed to record payment"));
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  }

  function set<K extends keyof PaymentFormData>(key: K, value: PaymentFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {restored ? (
        <div className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Draft restored</span>
          <button type="button" onClick={discardDraft} className="text-primary hover:underline">
            Discard draft
          </button>
        </div>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <FormField label="Company / Customer">
        <SelectInput
          value={form.customerId}
          onChange={(v) => set("customerId", v)}
          placeholder="Select company"
          required
          disabled={!!defaultValues?.customerId}
          options={customers.map((c) => ({
            value: String(c.id),
            label: String(c.companyName ?? c.id),
          }))}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Amount received (₹)">
          <TextInput
            value={form.paidAmount}
            onChange={(v) => set("paidAmount", v)}
            type="number"
            required
          />
        </FormField>
        <FormField label="Total deal amount (₹)">
          <TextInput
            value={form.totalAmount}
            onChange={(v) => set("totalAmount", v)}
            type="number"
            placeholder="Optional"
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Payment method">
          <SelectInput
            value={form.paymentMethod}
            onChange={(v) => set("paymentMethod", v)}
            options={PAYMENT_METHODS.map((m) => ({ value: m, label: formatLabel(m) }))}
          />
        </FormField>
        <FormField label="Status">
          <SelectInput
            value={form.status}
            onChange={(v) => set("status", v)}
            options={PAYMENT_STATUSES.map((s) => ({ value: s, label: formatLabel(s) }))}
          />
        </FormField>
      </div>

      <FormField label="Transaction / UPI reference">
        <TextInput value={form.transactionId} onChange={(v) => set("transactionId", v)} />
      </FormField>

      <FormField label="Collection date">
        <TextInput value={form.collectedAt} onChange={(v) => set("collectedAt", v)} type="date" />
      </FormField>

      <FormField label="Payment proof">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleProofFile(file);
          }}
        />
        {proof ? (
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
            <span className="truncate">{proof.filename}</span>
            <button type="button" onClick={() => setProof(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground hover:border-primary hover:text-primary"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading…" : "Upload screenshot or PDF"}
          </button>
        )}
        <p className="mt-1 text-xs text-muted-foreground">Required for collections of ₹1,000 or more when status is Paid.</p>
      </FormField>

      <FormField label="Notes">
        <TextArea value={form.notes} onChange={(v) => set("notes", v)} placeholder="Optional notes" />
      </FormField>

      {dirty && !defaultValues?.invoiceId ? (
        <p className="text-xs text-muted-foreground">Draft auto-saved locally</p>
      ) : null}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel ? (
          <button type="button" onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={mutation.isPending || uploading}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-indigo-600 disabled:opacity-60"
        >
          {mutation.isPending ? "Saving…" : "Record collection"}
        </button>
      </div>
    </form>
  );
}
