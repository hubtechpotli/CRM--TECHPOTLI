"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { GlassCard } from "@/components/ui/glass-card";
import { Modal } from "@/components/ui/modal";
import { FormField, TextInput } from "@/components/ui/form-field";

type Domain = Record<string, unknown>;

const emptyForm = {
  domainName: "",
  registrar: "",
  username: "",
  password: "",
  purchaseDate: "",
  expiryDate: "",
  autoRenewEnabled: false,
  renewalAmount: "",
  nameservers: "",
};

function toForm(d?: Domain) {
  if (!d) return emptyForm;
  return {
    domainName: String(d.domainName ?? ""),
    registrar: String(d.registrar ?? ""),
    username: "",
    password: "",
    purchaseDate: d.purchaseDate ? String(d.purchaseDate).slice(0, 10) : "",
    expiryDate: d.expiryDate ? String(d.expiryDate).slice(0, 10) : "",
    autoRenewEnabled: Boolean(d.autoRenewEnabled),
    renewalAmount: d.renewalAmount != null ? String(d.renewalAmount) : "",
    nameservers: Array.isArray(d.nameservers) ? (d.nameservers as string[]).join(", ") : "",
  };
}

type DomainForm = ReturnType<typeof toForm>;

function toBody(form: DomainForm) {
  const body: Record<string, unknown> = {
    domainName: form.domainName.trim(),
    registrar: form.registrar.trim() || undefined,
    expiryDate: form.expiryDate,
    autoRenewEnabled: form.autoRenewEnabled,
    nameservers: form.nameservers
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
  if (form.username) body.username = form.username;
  if (form.password) body.password = form.password;
  if (form.purchaseDate) body.purchaseDate = form.purchaseDate;
  if (form.renewalAmount) body.renewalAmount = Number(form.renewalAmount);
  return body;
}

export function CustomerDomainsPanel({ customerId }: { customerId: string }) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Domain | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: domains = [], isLoading } = useQuery({
    queryKey: ["customer-domains", customerId],
    queryFn: async () => {
      const res = await api.get<Domain[]>(`/customers/${customerId}/domains`);
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = toBody(form);
      if (editing) {
        const res = await api.patch(`/customers/${customerId}/domains/${editing.id}`, body);
        return res.data;
      }
      const res = await api.post(`/customers/${customerId}/domains`, body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-domains", customerId] });
      queryClient.invalidateQueries({ queryKey: ["customer-timeline", customerId] });
      setShowModal(false);
      setEditing(null);
      setForm(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (domainId: string) => {
      await api.delete(`/customers/${customerId}/domains/${domainId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-domains", customerId] });
    },
  });

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(d: Domain) {
    setEditing(d);
    setForm(toForm(d));
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
          + Add domain
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading domains…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {domains.map((d) => (
            <GlassCard key={String(d.id)}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-medium">{String(d.domainName)}</h4>
                  {d.registrar ? <p className="text-xs text-muted-foreground">{String(d.registrar)}</p> : null}
                </div>
                <div className="flex gap-2 text-xs">
                  <button type="button" onClick={() => openEdit(d)} className="text-primary hover:underline">
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Remove this domain?")) deleteMutation.mutate(String(d.id));
                    }}
                    className="text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Expires</dt>
                  <dd>{formatDate(d.expiryDate)}</dd>
                </div>
                {d.purchaseDate ? (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Purchased</dt>
                    <dd>{formatDate(d.purchaseDate)}</dd>
                  </div>
                ) : null}
                {d.renewalAmount != null ? (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Renewal</dt>
                    <dd>{formatMoney(d.renewalAmount)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Auto-renew</dt>
                  <dd>{d.autoRenewEnabled ? "Yes" : "No"}</dd>
                </div>
                {Array.isArray(d.nameservers) && (d.nameservers as string[]).length ? (
                  <p className="text-xs text-muted-foreground">NS: {(d.nameservers as string[]).join(", ")}</p>
                ) : null}
              </dl>
            </GlassCard>
          ))}
          {!domains.length ? (
            <p className="text-sm text-muted-foreground sm:col-span-2">No domains registered yet.</p>
          ) : null}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit domain" : "Add domain"} size="lg">
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-4"
        >
          <FormField label="Domain name">
            <TextInput
              value={form.domainName}
              onChange={(v) => setForm((f) => ({ ...f, domainName: v }))}
              required
              placeholder="example.com"
            />
          </FormField>
          <FormField label="Registrar">
            <TextInput value={form.registrar} onChange={(v) => setForm((f) => ({ ...f, registrar: v }))} placeholder="GoDaddy, Namecheap, etc." />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Username">
              <TextInput value={form.username} onChange={(v) => setForm((f) => ({ ...f, username: v }))} placeholder={editing ? "Leave blank to keep" : ""} />
            </FormField>
            <FormField label="Password">
              <TextInput value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} type="password" placeholder={editing ? "Leave blank to keep" : ""} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Purchase date">
              <TextInput value={form.purchaseDate} onChange={(v) => setForm((f) => ({ ...f, purchaseDate: v }))} type="date" />
            </FormField>
            <FormField label="Expiry date">
              <TextInput value={form.expiryDate} onChange={(v) => setForm((f) => ({ ...f, expiryDate: v }))} type="date" required />
            </FormField>
          </div>
          <FormField label="Renewal amount (₹)">
            <TextInput value={form.renewalAmount} onChange={(v) => setForm((f) => ({ ...f, renewalAmount: v }))} type="number" />
          </FormField>
          <FormField label="Nameservers (comma-separated)">
            <TextInput value={form.nameservers} onChange={(v) => setForm((f) => ({ ...f, nameservers: v }))} placeholder="ns1.example.com, ns2.example.com" />
          </FormField>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.autoRenewEnabled}
              onChange={(e) => setForm((f) => ({ ...f, autoRenewEnabled: e.target.checked }))}
              className="rounded border-border"
            />
            Auto-renew enabled
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-border px-4 py-2 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={saveMutation.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {saveMutation.isPending ? "Saving…" : editing ? "Save changes" : "Add domain"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
