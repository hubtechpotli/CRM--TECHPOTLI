"use client";

import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { appendListItem, createTempId } from "@/lib/optimistic-mutation";
import { api } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import { GlassCard } from "@/components/ui/glass-card";
import { Modal } from "@/components/ui/modal";
import { FormField, TextArea, TextInput } from "@/components/ui/form-field";

type CallLog = Record<string, unknown> & {
  user?: { name?: string };
};

const emptyForm = {
  notes: "",
  followUpDate: "",
};

export function CustomerCallLogsPanel({ customerId }: { customerId: string }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: callLogs = [], isLoading } = useQuery({
    queryKey: ["customer-call-logs", customerId],
    queryFn: async () => {
      const res = await api.get<CallLog[]>(`/customers/${customerId}/call-logs`);
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const logsKey = ["customer-call-logs", customerId] as const;

  const createMutation = useOptimisticMutation({
    mutationFn: async () => {
      const res = await api.post(`/customers/${customerId}/call-logs`, {
        notes: form.notes.trim(),
        followUpDate: form.followUpDate || undefined,
      });
      return res.data;
    },
    snapshotKeys: [logsKey],
    invalidateKeys: [logsKey, ["customer-timeline", customerId]],
    onMutate: () => {
      appendListItem(queryClient, logsKey, {
        id: createTempId(),
        notes: form.notes.trim(),
        followUpDate: form.followUpDate || null,
        createdAt: new Date().toISOString(),
      });
      setShowAdd(false);
      setForm(emptyForm);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          + Log call
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading call logs…</p>
      ) : (
        <div className="space-y-3">
          {callLogs.map((log) => (
            <GlassCard key={String(log.id)}>
              <div className="flex flex-wrap items-start justify-between gap-2 text-xs text-muted-foreground">
                <span>{formatDateTime(log.callDate ?? log.createdAt)}</span>
                {log.user?.name ? <span>by {log.user.name}</span> : null}
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap">{String(log.notes)}</p>
              {log.followUpDate ? (
                <p className="mt-2 text-xs text-muted-foreground">Follow-up: {formatDate(log.followUpDate)}</p>
              ) : null}
            </GlassCard>
          ))}
          {!callLogs.length ? <p className="text-sm text-muted-foreground">No call logs recorded yet.</p> : null}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Log call">
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-4"
        >
          <FormField label="Notes">
            <TextArea value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} required rows={4} placeholder="Call summary…" />
          </FormField>
          <FormField label="Follow-up date (optional)">
            <TextInput value={form.followUpDate} onChange={(v) => setForm((f) => ({ ...f, followUpDate: v }))} type="date" />
          </FormField>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border border-border px-4 py-2 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={createMutation.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {createMutation.isPending ? "Saving…" : "Save call log"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
