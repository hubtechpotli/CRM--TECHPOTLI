"use client";

import { FormEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { appendToMatchingLists, createTempId, replaceMatchingListItemId } from "@/lib/optimistic-mutation";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { formatLabel } from "@/lib/format";
import { FormField, SelectInput, TextArea, TextInput } from "@/components/ui/form-field";
import { CustomerPickerField } from "@/components/ui/customer-picker-field";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export function SupportTicketForm({
  onSuccess,
  onCancel,
}: {
  onSuccess?: (data: Record<string, unknown>) => void;
  onCancel?: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    customerId: "",
    subject: "",
    description: "",
    priority: "MEDIUM",
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useOptimisticMutation({
    mutationFn: async () => {
      const res = await api.post("/support/tickets", {
        customerId: form.customerId,
        subject: form.subject.trim(),
        description: form.description.trim(),
        priority: form.priority,
      });
      return res.data;
    },
    snapshotKeys: [["support-tickets"]],
    invalidateKeys: [["support-tickets"]],
    onMutate: () => {
      const tempId = createTempId();
      appendToMatchingLists(queryClient, ["support-tickets"], {
        id: tempId,
        subject: form.subject.trim(),
        priority: form.priority,
        status: "OPEN",
        createdAt: new Date().toISOString(),
      });
      return { tempId };
    },
    onSuccess: (data, _vars, context) => {
      if (context?.tempId && data && typeof data === "object" && "id" in data) {
        replaceMatchingListItemId(
          queryClient,
          ["support-tickets"],
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
        : "Failed to create ticket";
      setError(Array.isArray(message) ? message.join(", ") : String(message));
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.customerId) {
      setError("Please select a customer.");
      return;
    }
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
            onChange={(customerId) => setForm((f) => ({ ...f, customerId }))}
            required
          />
        </div>
        <FormField label="Subject" className="sm:col-span-2">
          <TextInput
            value={form.subject}
            onChange={(v) => setForm((f) => ({ ...f, subject: v }))}
            placeholder="Brief summary of the issue"
            required
          />
        </FormField>
        <FormField label="Priority">
          <SelectInput
            value={form.priority}
            onChange={(v) => setForm((f) => ({ ...f, priority: v }))}
            options={PRIORITIES.map((p) => ({ value: p, label: formatLabel(p) }))}
          />
        </FormField>
        <FormField label="Description" className="sm:col-span-2">
          <TextArea
            value={form.description}
            onChange={(v) => setForm((f) => ({ ...f, description: v }))}
            placeholder="Describe the issue in detail"
            required
          />
        </FormField>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        {onCancel ? (
          <button type="button" onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
            Cancel
          </button>
        ) : null}
        <button type="submit" disabled={mutation.isPending} className="crm-btn-primary disabled:opacity-60">
          {mutation.isPending ? "Creating…" : "Create ticket"}
        </button>
      </div>
    </form>
  );
}
