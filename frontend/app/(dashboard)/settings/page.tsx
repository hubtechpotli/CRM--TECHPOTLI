"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { CardSkeleton } from "@/components/ui/skeleton";
import { FormField, TextInput } from "@/components/ui/form-field";
import { ListActionButton } from "@/components/dashboard/list-actions";
import { SecurityPanel } from "@/components/settings/security-panel";

type SettingsData = Record<string, unknown>;
type AllowedIp = Record<string, unknown>;

const SETTINGS_FIELDS: { key: string; label: string; type?: string }[] = [
  { key: "companyName", label: "Company name" },
  { key: "companyAddress", label: "Company address" },
  { key: "companyGst", label: "GST number" },
  { key: "companyPhone", label: "Company phone" },
  { key: "companyEmail", label: "Company email", type: "email" },
  { key: "gstRate", label: "GST rate (%)", type: "number" },
  { key: "invoiceNumberPrefix", label: "Invoice prefix" },
  { key: "workingHoursStart", label: "Working hours start" },
  { key: "lateThreshold", label: "Late threshold" },
];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});
  const [force2FA, setForce2FA] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [ipError, setIpError] = useState<string | null>(null);
  const [newIp, setNewIp] = useState({ cidr: "", label: "" });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await api.get<SettingsData>("/settings");
      return res.data;
    },
  });

  const { data: allowedIps = [], isLoading: ipsLoading } = useQuery({
    queryKey: ["settings-allowed-ips"],
    queryFn: async () => {
      const res = await api.get<AllowedIp[]>("/settings/allowed-ips");
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  useEffect(() => {
    if (!data) return;
    const next: Record<string, string> = {};
    for (const field of SETTINGS_FIELDS) {
      const val = data[field.key];
      next[field.key] = val != null ? String(val) : "";
    }
    setForm(next);
    setForce2FA(!!data.force2FA);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { force2FA };
      for (const field of SETTINGS_FIELDS) {
        const val = form[field.key]?.trim();
        if (field.type === "number") {
          body[field.key] = val ? Number(val) : undefined;
        } else {
          body[field.key] = val || undefined;
        }
      }
      const res = await api.patch("/settings", body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setSaveError(null);
    },
    onError: (err) => {
      const message = isAxiosError(err)
        ? (err.response?.data as { message?: string | string[] })?.message ?? err.message
        : "Failed to save settings";
      setSaveError(Array.isArray(message) ? message.join(", ") : String(message));
    },
  });

  const addIpMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/settings/allowed-ips", {
        cidr: newIp.cidr.trim(),
        label: newIp.label.trim() || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-allowed-ips"] });
      setNewIp({ cidr: "", label: "" });
      setIpError(null);
    },
    onError: (err) => {
      const message = isAxiosError(err)
        ? (err.response?.data as { message?: string | string[] })?.message ?? err.message
        : "Failed to add IP";
      setIpError(Array.isArray(message) ? message.join(", ") : String(message));
    },
  });

  const removeIpMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/settings/allowed-ips/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-allowed-ips"] });
      setIpError(null);
    },
    onError: (err) => {
      const message = isAxiosError(err)
        ? (err.response?.data as { message?: string | string[] })?.message ?? err.message
        : "Failed to remove IP";
      setIpError(Array.isArray(message) ? message.join(", ") : String(message));
    },
  });

  function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);
    saveMutation.mutate();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="System configuration — super admin only." />
      <GlassCard>
        {isLoading ? (
          <CardSkeleton className="h-48" />
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-sm text-red-500">Unable to load settings. Super admin access required.</p>
            <button type="button" onClick={() => refetch()} className="mt-3 text-sm font-medium text-primary hover:underline">
              Retry
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {saveError ? <p className="text-sm text-red-500">{saveError}</p> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              {SETTINGS_FIELDS.map((field) => (
                <FormField key={field.key} label={field.label}>
                  <TextInput
                    value={form[field.key] ?? ""}
                    onChange={(v) => setForm((f) => ({ ...f, [field.key]: v }))}
                    type={field.type ?? "text"}
                  />
                </FormField>
              ))}
              <FormField label="Force 2FA" className="sm:col-span-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={force2FA} onChange={(e) => setForce2FA(e.target.checked)} />
                  Require two-factor authentication for all users
                </label>
              </FormField>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {saveMutation.isPending ? "Saving…" : "Save settings"}
              </button>
            </div>
          </form>
        )}
      </GlassCard>

      <GlassCard>
        <h3 className="mb-4 text-sm font-semibold">Allowed office IPs</h3>
        {ipError ? <p className="mb-3 text-sm text-red-500">{ipError}</p> : null}
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            setIpError(null);
            addIpMutation.mutate();
          }}
          className="mb-4 flex flex-wrap items-end gap-3"
        >
          <FormField label="CIDR / IP">
            <TextInput value={newIp.cidr} onChange={(v) => setNewIp((f) => ({ ...f, cidr: v }))} placeholder="192.168.1.0/24" required />
          </FormField>
          <FormField label="Label">
            <TextInput value={newIp.label} onChange={(v) => setNewIp((f) => ({ ...f, label: v }))} placeholder="Office network" />
          </FormField>
          <button
            type="submit"
            disabled={addIpMutation.isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {addIpMutation.isPending ? "Adding…" : "Add IP"}
          </button>
        </form>
        {ipsLoading ? (
          <CardSkeleton className="h-24" />
        ) : (
          <ul className="divide-y divide-border/50 text-sm">
            {allowedIps.map((ip) => (
              <li key={String(ip.id)} className="flex items-center justify-between py-2">
                <div>
                  <span className="font-medium">{String(ip.cidr)}</span>
                  {ip.label ? <span className="ml-2 text-muted-foreground">({String(ip.label)})</span> : null}
                  {ip.isActive === false ? (
                    <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">Inactive</span>
                  ) : null}
                </div>
                <ListActionButton
                  label="Remove"
                  variant="danger"
                  disabled={removeIpMutation.isPending}
                  onClick={() => {
                    if (confirm("Remove this allowed IP?")) removeIpMutation.mutate(String(ip.id));
                  }}
                />
              </li>
            ))}
            {!allowedIps.length ? <li className="py-4 text-center text-muted-foreground">No allowed IPs configured</li> : null}
          </ul>
        )}
      </GlassCard>

      <SecurityPanel />
    </div>
  );
}
