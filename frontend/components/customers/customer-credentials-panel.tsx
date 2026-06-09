"use client";

import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { appendListItem, createTempId } from "@/lib/optimistic-mutation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { GlassCard } from "@/components/ui/glass-card";
import { Modal } from "@/components/ui/modal";
import { FormField, SelectInput, TextInput } from "@/components/ui/form-field";
import { VAULT_TYPES } from "@/lib/types";

type Credential = Record<string, unknown>;

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const emptyForm = { vaultType: "GMAIL", label: "", username: "", password: "", url: "" };

export function CustomerCredentialsPanel({ customerId }: { customerId: string }) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  const { data: credentials = [], isLoading } = useQuery({
    queryKey: ["customer-credentials", customerId],
    queryFn: async () => {
      const res = await api.get<Credential[]>(`/customers/${customerId}/credentials`);
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const credsKey = ["customer-credentials", customerId] as const;

  const createMutation = useOptimisticMutation({
    mutationFn: async () => {
      const res = await api.post(`/customers/${customerId}/credentials`, form);
      return res.data;
    },
    snapshotKeys: [credsKey],
    invalidateKeys: [credsKey],
    onMutate: () => {
      appendListItem(queryClient, credsKey, {
        id: createTempId(),
        vaultType: form.vaultType,
        label: form.label,
        username: form.username,
        url: form.url,
      });
      setShowAdd(false);
      setForm(emptyForm);
    },
  });

  async function revealPassword(credId: string) {
    if (!isAdmin) return;
    try {
      const res = await api.get<{ password?: string }>(`/customers/${customerId}/credentials/${credId}/reveal`);
      if (res.data.password) {
        setRevealed((prev) => ({ ...prev, [credId]: res.data.password! }));
      }
    } catch {
      alert("Unable to reveal credential. Admin permission required.");
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Passwords are encrypted and hidden by default. Reveal requires admin permission. All views are logged.
      </p>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          + Add credential
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading credentials…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {credentials.map((c) => (
            <GlassCard key={String(c.id)}>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">{String(c.label)}</h4>
                  <p className="text-xs text-muted-foreground">{formatLabel(String(c.vaultType))}</p>
                </div>
              </div>
              <dl className="mt-3 space-y-1 text-sm">
                {c.username ? (
                  <div className="flex justify-between"><dt className="text-muted-foreground">Username</dt><dd>{String(c.username)}</dd></div>
                ) : null}
                <div className="flex justify-between items-center">
                  <dt className="text-muted-foreground">Password</dt>
                  <dd className="font-mono text-xs">
                    {revealed[String(c.id)] ?? "••••••••"}
                  </dd>
                </div>
                {c.url ? (
                  <div className="flex justify-between"><dt className="text-muted-foreground">URL</dt><dd className="truncate max-w-[160px]">{String(c.url)}</dd></div>
                ) : null}
              </dl>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => revealPassword(String(c.id))}
                  className="mt-3 text-xs text-primary hover:underline"
                >
                  {revealed[String(c.id)] ? "Revealed" : "Reveal password"}
                </button>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">Admin permission required to view</p>
              )}
            </GlassCard>
          ))}
          {!credentials.length ? (
            <p className="text-sm text-muted-foreground sm:col-span-2">No credentials stored. Add Gmail, Facebook, Instagram, or YouTube passwords.</p>
          ) : null}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add credential">
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
          <FormField label="Type">
            <SelectInput
              value={form.vaultType}
              onChange={(v) => setForm((f) => ({ ...f, vaultType: v }))}
              options={VAULT_TYPES.map((t) => ({ value: t, label: formatLabel(t) }))}
            />
          </FormField>
          <FormField label="Label">
            <TextInput value={form.label} onChange={(v) => setForm((f) => ({ ...f, label: v }))} required placeholder="e.g. Main Gmail account" />
          </FormField>
          <FormField label="Username / email">
            <TextInput value={form.username} onChange={(v) => setForm((f) => ({ ...f, username: v }))} />
          </FormField>
          <FormField label="Password">
            <TextInput value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} type="password" required />
          </FormField>
          <FormField label="URL (optional)">
            <TextInput value={form.url} onChange={(v) => setForm((f) => ({ ...f, url: v }))} />
          </FormField>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border border-border px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {createMutation.isPending ? "Saving…" : "Save credential"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
