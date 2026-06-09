"use client";

import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { appendListItem, createTempId, patchListItem, removeListItem } from "@/lib/optimistic-mutation";
import { api } from "@/lib/api";
import { formatLabel } from "@/lib/format";
import { GlassCard } from "@/components/ui/glass-card";
import { Modal } from "@/components/ui/modal";
import { FormField, SelectInput, TextArea, TextInput } from "@/components/ui/form-field";
import { SERVICE_TYPES } from "@/lib/types";

type Service = Record<string, unknown>;

const emptyForm = {
  serviceType: "WEBSITE_DEV",
  paymentType: "ONE_TIME",
  oneTimeAmount: "",
  monthlyAmount: "",
  adsPlatform: "",
  adsMonthlyBudget: "",
  adsCampaignNotes: "",
  isActive: true,
};

function toForm(s?: Service) {
  if (!s) return emptyForm;
  return {
    serviceType: String(s.serviceType ?? "WEBSITE_DEV"),
    paymentType: String(s.paymentType ?? "ONE_TIME"),
    oneTimeAmount: s.oneTimeAmount != null ? String(s.oneTimeAmount) : "",
    monthlyAmount: s.monthlyAmount != null ? String(s.monthlyAmount) : "",
    adsPlatform: String(s.adsPlatform ?? ""),
    adsMonthlyBudget: s.adsMonthlyBudget != null ? String(s.adsMonthlyBudget) : "",
    adsCampaignNotes: String(s.adsCampaignNotes ?? ""),
    isActive: s.isActive !== false,
  };
}

type ServiceForm = ReturnType<typeof toForm>;

function buildBody(form: ServiceForm) {
  const isWebsite = form.serviceType === "WEBSITE_DEV";
  const body: Record<string, unknown> = {
    serviceType: form.serviceType,
    paymentType: isWebsite ? form.paymentType : "MONTHLY",
    isActive: form.isActive,
  };
  body.oneTimeAmount = form.oneTimeAmount ? Number(form.oneTimeAmount) : null;
  body.monthlyAmount = form.monthlyAmount ? Number(form.monthlyAmount) : null;
  if (form.serviceType === "ADS_MANAGEMENT") {
    body.adsPlatform = form.adsPlatform.trim() || null;
    body.adsMonthlyBudget = form.adsMonthlyBudget ? Number(form.adsMonthlyBudget) : null;
    body.adsCampaignNotes = form.adsCampaignNotes.trim() || null;
  }
  return body;
}

export function CustomerServicesPanel({ customerId }: { customerId: string }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["customer-services", customerId],
    queryFn: async () => {
      const res = await api.get<Service[]>(`/customers/${customerId}/services`);
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const servicesKey = ["customer-services", customerId] as const;
  const serviceInvalidateKeys = [
    servicesKey,
    ["customer", customerId],
    ["customer-revenue", customerId],
  ] as const;

  const createMutation = useOptimisticMutation({
    mutationFn: async () => {
      const res = await api.post(`/customers/${customerId}/services`, buildBody(form));
      return res.data;
    },
    snapshotKeys: [servicesKey],
    invalidateKeys: [...serviceInvalidateKeys],
    onMutate: () => {
      appendListItem(queryClient, servicesKey, {
        id: createTempId(),
        ...buildBody(form),
      });
      setShowAdd(false);
      setForm(emptyForm);
    },
  });

  const updateMutation = useOptimisticMutation({
    mutationFn: async () => {
      const res = await api.patch(`/customers/${customerId}/services/${editing!.id}`, buildBody(form));
      return res.data;
    },
    snapshotKeys: [servicesKey],
    invalidateKeys: [...serviceInvalidateKeys],
    onMutate: () => {
      patchListItem(queryClient, servicesKey, String(editing!.id), buildBody(form));
      setEditing(null);
      setForm(emptyForm);
    },
  });

  const toggleActiveMutation = useOptimisticMutation({
    mutationFn: async ({ serviceId, isActive }: { serviceId: string; isActive: boolean }) => {
      const res = await api.patch(`/customers/${customerId}/services/${serviceId}`, { isActive });
      return res.data;
    },
    snapshotKeys: [servicesKey],
    invalidateKeys: [...serviceInvalidateKeys],
    onMutate: ({ serviceId, isActive }) => {
      patchListItem(queryClient, servicesKey, serviceId, { isActive });
    },
  });

  const deleteMutation = useOptimisticMutation({
    mutationFn: async (serviceId: string) => {
      await api.delete(`/customers/${customerId}/services/${serviceId}`);
    },
    snapshotKeys: [servicesKey],
    invalidateKeys: [...serviceInvalidateKeys],
    onMutate: (serviceId) => {
      removeListItem(queryClient, servicesKey, serviceId);
    },
  });

  const isWebsite = form.serviceType === "WEBSITE_DEV";
  const isAds = form.serviceType === "ADS_MANAGEMENT";
  const isMonthlyService = ["SEO", "SOCIAL_MEDIA", "ADS_MANAGEMENT"].includes(form.serviceType);
  const modalOpen = showAdd || Boolean(editing);

  function closeModal() {
    setShowAdd(false);
    setEditing(null);
    setForm(emptyForm);
  }

  function openEdit(s: Service) {
    setEditing(s);
    setForm(toForm(s));
    setShowAdd(false);
  }

  function renderForm(onSubmit: () => void, pending: boolean, submitLabel: string) {
    return (
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          onSubmit();
        }}
        className="space-y-4"
      >
        <FormField label="Service type">
          <SelectInput
            value={form.serviceType}
            onChange={(v) => setForm((f) => ({ ...f, serviceType: v }))}
            options={SERVICE_TYPES.filter((s) => s !== "CUSTOM").map((s) => ({ value: s, label: formatLabel(s) }))}
            disabled={Boolean(editing)}
          />
        </FormField>
        {isWebsite ? (
          <FormField label="Payment option">
            <SelectInput
              value={form.paymentType}
              onChange={(v) => setForm((f) => ({ ...f, paymentType: v }))}
              options={[
                { value: "ONE_TIME", label: "One Time Payment" },
                { value: "MONTHLY", label: "Monthly Subscription" },
              ]}
            />
          </FormField>
        ) : null}
        {isWebsite && form.paymentType === "ONE_TIME" ? (
          <FormField label="One-time amount (₹)">
            <TextInput value={form.oneTimeAmount} onChange={(v) => setForm((f) => ({ ...f, oneTimeAmount: v }))} type="number" required />
          </FormField>
        ) : null}
        {(isWebsite && form.paymentType === "MONTHLY") || isMonthlyService ? (
          <FormField label="Monthly amount (₹)">
            <TextInput value={form.monthlyAmount} onChange={(v) => setForm((f) => ({ ...f, monthlyAmount: v }))} type="number" required />
          </FormField>
        ) : null}
        {isAds ? (
          <>
            <FormField label="Platform">
              <TextInput value={form.adsPlatform} onChange={(v) => setForm((f) => ({ ...f, adsPlatform: v }))} placeholder="Google, Meta, etc." />
            </FormField>
            <FormField label="Monthly budget (₹)">
              <TextInput value={form.adsMonthlyBudget} onChange={(v) => setForm((f) => ({ ...f, adsMonthlyBudget: v }))} type="number" />
            </FormField>
            <FormField label="Campaign notes">
              <TextArea value={form.adsCampaignNotes} onChange={(v) => setForm((f) => ({ ...f, adsCampaignNotes: v }))} />
            </FormField>
          </>
        ) : null}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            className="rounded border-border"
          />
          Active service
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={closeModal} className="rounded-lg border border-border px-4 py-2 text-sm">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {pending ? "Saving…" : submitLabel}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setForm(emptyForm);
            setShowAdd(true);
          }}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          + Add service
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading services…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {services.map((s) => (
            <GlassCard key={String(s.id)}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{formatLabel(String(s.serviceType))}</h4>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${s.isActive !== false ? "bg-green-500/10 text-green-700" : "bg-muted text-muted-foreground"}`}>
                      {s.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatLabel(String(s.paymentType ?? ""))}</p>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs">
                  <button type="button" onClick={() => openEdit(s)} className="text-primary hover:underline">
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Remove this service?")) deleteMutation.mutate(String(s.id));
                    }}
                    className="text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <dl className="mt-3 space-y-1 text-sm">
                {s.oneTimeAmount != null ? (
                  <div className="flex justify-between"><dt className="text-muted-foreground">One-time</dt><dd>₹{String(s.oneTimeAmount)}</dd></div>
                ) : null}
                {s.monthlyAmount != null ? (
                  <div className="flex justify-between"><dt className="text-muted-foreground">Monthly</dt><dd>₹{String(s.monthlyAmount)}</dd></div>
                ) : null}
                {s.adsPlatform ? (
                  <div className="flex justify-between"><dt className="text-muted-foreground">Platform</dt><dd>{String(s.adsPlatform)}</dd></div>
                ) : null}
                {s.adsMonthlyBudget != null ? (
                  <div className="flex justify-between"><dt className="text-muted-foreground">Ads budget</dt><dd>₹{String(s.adsMonthlyBudget)}</dd></div>
                ) : null}
                {s.adsCampaignNotes ? (
                  <p className="text-xs text-muted-foreground">{String(s.adsCampaignNotes)}</p>
                ) : null}
              </dl>
              <label className="mt-3 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={s.isActive !== false}
                  onChange={(e) =>
                    toggleActiveMutation.mutate({ serviceId: String(s.id), isActive: e.target.checked })
                  }
                  disabled={toggleActiveMutation.isPending}
                  className="rounded border-border"
                />
                Active
              </label>
            </GlassCard>
          ))}
          {!services.length ? (
            <p className="text-sm text-muted-foreground sm:col-span-2">No services yet. Add website dev, SEO, ads, or social media management.</p>
          ) : null}
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editing ? "Edit service" : "Add service"} size="lg">
        {editing
          ? renderForm(() => updateMutation.mutate(), updateMutation.isPending, "Save changes")
          : renderForm(() => createMutation.mutate(), createMutation.isPending, "Add service")}
      </Modal>
    </div>
  );
}
