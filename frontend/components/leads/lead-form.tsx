"use client";

import { FormEvent, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import {
  appendToMatchingLists,
  createTempId,
  patchDetailItem,
  patchMatchingListItems,
  replaceMatchingListItemId,
} from "@/lib/optimistic-mutation";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { LEAD_PRIORITIES, LEAD_SOURCES, SERVICE_TYPES } from "@/lib/types";
import { FormField, SelectInput, TextArea, TextInput } from "@/components/ui/form-field";
import { cn } from "@/lib/utils";
import { getPriorityMeta } from "@/lib/lead-ui";

type LeadFormData = {
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  source: string;
  priority: string;
  budget: string;
  remarks: string;
  interestedServices: string[];
};

const emptyForm: LeadFormData = {
  companyName: "",
  contactName: "",
  phone: "",
  email: "",
  source: "OTHER",
  priority: "MEDIUM",
  budget: "",
  remarks: "",
  interestedServices: [],
};

function toFormData(lead?: Record<string, unknown>): LeadFormData {
  if (!lead) return emptyForm;
  return {
    companyName: String(lead.companyName ?? ""),
    contactName: String(lead.contactName ?? ""),
    phone: String(lead.phone ?? ""),
    email: String(lead.email ?? ""),
    source: String(lead.source ?? "OTHER"),
    priority: String(lead.priority ?? "MEDIUM"),
    budget: lead.budget != null ? String(lead.budget) : "",
    remarks: String(lead.remarks ?? ""),
    interestedServices: Array.isArray(lead.interestedServices) ? (lead.interestedServices as string[]) : [],
  };
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b border-border/60 pb-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function LeadForm({
  lead,
  onSuccess,
  onCancel,
}: {
  lead?: Record<string, unknown>;
  onSuccess?: (data: Record<string, unknown>) => void;
  onCancel?: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!lead?.id;
  const [form, setForm] = useState<LeadFormData>(() => toFormData(lead));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(toFormData(lead));
  }, [lead]);

  function buildBody(payload: LeadFormData) {
    return {
      companyName: payload.companyName.trim(),
      contactName: payload.contactName.trim(),
      phone: payload.phone.trim(),
      email: payload.email.trim() || undefined,
      source: payload.source,
      priority: payload.priority,
      budget: payload.budget ? Number(payload.budget) : undefined,
      remarks: payload.remarks.trim() || undefined,
      interestedServices: payload.interestedServices.length ? payload.interestedServices : undefined,
    };
  }

  const mutation = useOptimisticMutation({
    mutationFn: async (payload: LeadFormData) => {
      const body = buildBody(payload);
      if (isEdit) {
        const res = await api.patch(`/leads/${lead!.id}`, body);
        return res.data;
      }
      const res = await api.post("/leads", body);
      return res.data;
    },
    snapshotKeys: () =>
      isEdit
        ? [["lead", String(lead!.id)], ["leads"]]
        : [["leads"], ["leads-kanban"]],
    invalidateKeys: [["leads"], ["leads-kanban"], ["lead", String(lead?.id ?? "")]],
    onMutate: (payload) => {
      const body = buildBody(payload);
      if (isEdit) {
        const leadId = String(lead!.id);
        patchDetailItem(queryClient, ["lead", leadId], body);
        patchMatchingListItems(queryClient, ["leads"], leadId, body);
        return {};
      }
      const tempId = createTempId();
      const optimistic = { id: tempId, status: "NEW", ...body };
      appendToMatchingLists(queryClient, ["leads"], optimistic);
      return { tempId };
    },
    onSuccess: (data, _vars, context) => {
      if (context?.tempId && data && typeof data === "object" && "id" in data) {
        replaceMatchingListItemId(
          queryClient,
          ["leads"],
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
        : "Failed to save lead";
      setError(Array.isArray(message) ? message.join(", ") : String(message));
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate(form);
  }

  function set<K extends keyof LeadFormData>(key: K, value: LeadFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col">
      <div className="flex-1 space-y-6 overflow-y-auto pr-1">
        {error ? (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}

        <section className="space-y-4">
          <SectionHeader title="Contact" description="Who are you reaching out to?" />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Company name">
              <TextInput value={form.companyName} onChange={(v) => set("companyName", v)} required />
            </FormField>
            <FormField label="Contact name">
              <TextInput value={form.contactName} onChange={(v) => set("contactName", v)} required />
            </FormField>
            <FormField label="Phone">
              <TextInput value={form.phone} onChange={(v) => set("phone", v)} type="tel" required />
            </FormField>
            <FormField label="Email">
              <TextInput value={form.email} onChange={(v) => set("email", v)} type="email" />
            </FormField>
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeader title="Deal details" description="Source, priority, and budget" />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Source">
              <SelectInput
                value={form.source}
                onChange={(v) => set("source", v)}
                options={LEAD_SOURCES.map((s) => ({ value: s, label: formatLabel(s) }))}
              />
            </FormField>
            <FormField label="Budget (₹)" className="sm:col-span-1">
              <TextInput value={form.budget} onChange={(v) => set("budget", v)} type="number" placeholder="Optional" />
            </FormField>
          </div>
          <FormField label="Priority">
            <div className="flex flex-wrap gap-2">
              {LEAD_PRIORITIES.map((p) => {
                const meta = getPriorityMeta(p);
                const selected = form.priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => set("priority", p)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                      selected
                        ? cn(meta.bg, meta.border, meta.text, "ring-1 ring-primary/30")
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </FormField>
        </section>

        <section className="space-y-4">
          <SectionHeader title="Services" description="What are they interested in?" />
          <div className="flex flex-wrap gap-2">
            {SERVICE_TYPES.map((s) => {
              const checked = form.interestedServices.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    set(
                      "interestedServices",
                      checked ? form.interestedServices.filter((x) => x !== s) : [...form.interestedServices, s],
                    );
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                    checked
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {formatLabel(s)}
                </button>
              );
            })}
          </div>
          <FormField label="Remarks">
            <TextArea value={form.remarks} onChange={(v) => set("remarks", v)} placeholder="Notes about this lead" />
          </FormField>
        </section>
      </div>

      <div className="sticky bottom-0 mt-4 flex justify-end gap-2 border-t border-border/60 bg-background/95 pt-4 backdrop-blur-sm">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-indigo-600 disabled:opacity-60"
        >
          {mutation.isPending ? "Saving…" : isEdit ? "Update lead" : "Create lead"}
        </button>
      </div>
    </form>
  );
}
