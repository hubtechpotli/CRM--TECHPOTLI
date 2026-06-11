"use client";

import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { appendListItem, createTempId, patchListItem, removeListItem } from "@/lib/optimistic-mutation";
import { api } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { GlassCard } from "@/components/ui/glass-card";
import { Modal } from "@/components/ui/modal";
import { FormField, TextInput } from "@/components/ui/form-field";

type Hosting = Record<string, unknown>;

const emptyForm = {
  provider: "",
  controlPanelUrl: "",
  username: "",
  password: "",
  serverIp: "",
  hostingPlan: "",
  renewalDate: "",
  renewalAmount: "",
};

function toForm(h?: Hosting) {
  if (!h) return emptyForm;
  return {
    provider: String(h.provider ?? ""),
    controlPanelUrl: String(h.controlPanelUrl ?? ""),
    username: "",
    password: "",
    serverIp: String(h.serverIp ?? ""),
    hostingPlan: String(h.hostingPlan ?? ""),
    renewalDate: h.renewalDate ? String(h.renewalDate).slice(0, 10) : "",
    renewalAmount: h.renewalAmount != null ? String(h.renewalAmount) : "",
  };
}

type HostingForm = ReturnType<typeof toForm>;

function toBody(form: HostingForm) {
  const body: Record<string, unknown> = {
    provider: form.provider.trim(),
    renewalDate: form.renewalDate,
    controlPanelUrl: form.controlPanelUrl.trim() || undefined,
    serverIp: form.serverIp.trim() || undefined,
    hostingPlan: form.hostingPlan.trim() || undefined,
  };
  if (form.username) body.username = form.username;
  if (form.password) body.password = form.password;
  if (form.renewalAmount) body.renewalAmount = Number(form.renewalAmount);
  return body;
}

export function CustomerHostingPanel({ customerId }: { customerId: string }) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Hosting | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["customer-hosting", customerId],
    queryFn: async () => {
      const res = await api.get<Hosting[]>(`/customers/${customerId}/hosting`);
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const hostingKey = ["customer-hosting", customerId] as const;

  const saveMutation = useOptimisticMutation({
    mutationFn: async ({
      editingId,
      body,
    }: {
      editingId?: string;
      body: Record<string, unknown>;
    }) => {
      if (editingId) {
        const res = await api.patch(`/customers/${customerId}/hosting/${editingId}`, body);
        return res.data;
      }
      const res = await api.post(`/customers/${customerId}/hosting`, body);
      return res.data;
    },
    retry: 0,
    snapshotKeys: [hostingKey],
    invalidateKeys: [hostingKey, ["customer-timeline", customerId]],
    onMutate: ({ editingId, body }) => {
      if (editingId) {
        patchListItem(queryClient, hostingKey, editingId, body);
      } else {
        appendListItem(queryClient, hostingKey, { id: createTempId(), ...body });
      }
    },
    onSuccess: () => {
      setShowModal(false);
      setEditing(null);
      setForm(emptyForm);
    },
  });

  const deleteMutation = useOptimisticMutation({
    mutationFn: async (hostId: string) => {
      await api.delete(`/customers/${customerId}/hosting/${hostId}`);
    },
    snapshotKeys: [hostingKey],
    invalidateKeys: [hostingKey],
    onMutate: (hostId) => {
      removeListItem(queryClient, hostingKey, hostId);
    },
  });

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(h: Hosting) {
    setEditing(h);
    setForm(toForm(h));
    setShowModal(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openAdd}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          + Add hosting
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading hosting accounts…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {accounts.map((h) => (
            <GlassCard key={String(h.id)}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-medium">{String(h.provider)}</h4>
                  {h.hostingPlan ? <p className="text-xs text-muted-foreground">{String(h.hostingPlan)}</p> : null}
                </div>
                <div className="flex gap-2 text-xs">
                  <button type="button" onClick={() => openEdit(h)} className="text-primary hover:underline">
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Remove this hosting account?")) deleteMutation.mutate(String(h.id));
                    }}
                    className="text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Renewal</dt>
                  <dd>{formatDate(h.renewalDate)}</dd>
                </div>
                {h.renewalAmount != null ? (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Amount</dt>
                    <dd>{formatMoney(h.renewalAmount)}</dd>
                  </div>
                ) : null}
                {h.serverIp ? (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Server IP</dt>
                    <dd className="font-mono text-xs">{String(h.serverIp)}</dd>
                  </div>
                ) : null}
                {h.controlPanelUrl ? (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground shrink-0">Panel</dt>
                    <dd className="truncate text-xs text-primary">{String(h.controlPanelUrl)}</dd>
                  </div>
                ) : null}
              </dl>
            </GlassCard>
          ))}
          {!accounts.length ? (
            <p className="text-sm text-muted-foreground sm:col-span-2">No hosting accounts yet.</p>
          ) : null}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit hosting" : "Add hosting"} size="lg">
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            saveMutation.mutate({
              editingId: editing ? String(editing.id) : undefined,
              body: toBody(form),
            });
          }}
          className="space-y-4"
        >
          <FormField label="Provider">
            <TextInput value={form.provider} onChange={(v) => setForm((f) => ({ ...f, provider: v }))} required placeholder="Hostinger, AWS, etc." />
          </FormField>
          <FormField label="Hosting plan">
            <TextInput value={form.hostingPlan} onChange={(v) => setForm((f) => ({ ...f, hostingPlan: v }))} placeholder="Business, VPS, etc." />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Username">
              <TextInput value={form.username} onChange={(v) => setForm((f) => ({ ...f, username: v }))} placeholder={editing ? "Leave blank to keep" : ""} />
            </FormField>
            <FormField label="Password">
              <TextInput value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} type="password" placeholder={editing ? "Leave blank to keep" : ""} />
            </FormField>
          </div>
          <FormField label="Control panel URL">
            <TextInput value={form.controlPanelUrl} onChange={(v) => setForm((f) => ({ ...f, controlPanelUrl: v }))} placeholder="https://..." />
          </FormField>
          <FormField label="Server IP">
            <TextInput value={form.serverIp} onChange={(v) => setForm((f) => ({ ...f, serverIp: v }))} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Renewal date">
              <TextInput value={form.renewalDate} onChange={(v) => setForm((f) => ({ ...f, renewalDate: v }))} type="date" required />
            </FormField>
            <FormField label="Renewal amount (₹)">
              <TextInput value={form.renewalAmount} onChange={(v) => setForm((f) => ({ ...f, renewalAmount: v }))} type="number" />
            </FormField>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-border px-4 py-2 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={saveMutation.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {saveMutation.isPending ? "Saving…" : editing ? "Save changes" : "Add hosting"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
