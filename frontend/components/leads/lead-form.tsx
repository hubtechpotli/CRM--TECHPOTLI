"use client";

import { FormEvent, useEffect, useState } from "react";
import { Briefcase, Target, UserRound } from "lucide-react";
import { useFormDraft } from "@/hooks/use-form-draft";
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
import { FormFooterActions, FormShell } from "@/components/ui/form-shell";
import { FormSection } from "@/components/ui/form-section";
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
  const [editForm, setEditForm] = useState<LeadFormData>(() => toFormData(lead));
  const { form: draftForm, setForm: setDraftForm, restored, discardDraft, clearDraft } = useFormDraft({
    draftKey: "lead:new",
    initial: emptyForm,
    enabled: !isEdit,
  });
  const form = isEdit ? editForm : draftForm;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit) setEditForm(toFormData(lead));
  }, [lead, isEdit]);

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
      if (!isEdit) clearDraft();
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
    if (isEdit) setEditForm((prev) => ({ ...prev, [key]: value }));
    else setDraftForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormShell
        footer={
          <FormFooterActions
            onCancel={onCancel}
            submitLabel={isEdit ? "Update lead" : "Create lead"}
            pending={mutation.isPending}
          />
        }
      >
        {!isEdit && restored ? (
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Draft restored</span>
            <button type="button" onClick={discardDraft} className="font-medium text-foreground hover:underline">
              Discard draft
            </button>
          </div>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        ) : null}

        <FormSection title="Contact" description="Who are you reaching out to?" icon={UserRound} accent="cyan">
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
        </FormSection>

        <FormSection title="Deal details" description="Source, priority, and budget" icon={Target} accent="amber">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Source">
              <SelectInput
                value={form.source}
                onChange={(v) => set("source", v)}
                options={LEAD_SOURCES.map((s) => ({ value: s, label: formatLabel(s) }))}
              />
            </FormField>
            <FormField label="Budget (₹)">
              <TextInput value={form.budget} onChange={(v) => set("budget", v)} type="number" placeholder="Optional" />
            </FormField>
          </div>
          <FormField label="Priority" className="mt-4">
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
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      selected
                        ? cn(meta.bg, meta.border, meta.text, "shadow-sm")
                        : "border-border bg-card text-muted-foreground hover:border-foreground/20",
                    )}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </FormField>
        </FormSection>

        <FormSection title="Services" description="What are they interested in?" icon={Briefcase} accent="emerald">
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
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    checked
                      ? "border-emerald-400 bg-emerald-100 text-emerald-800 shadow-sm"
                      : "border-slate-200 bg-white text-muted-foreground hover:border-emerald-300",
                  )}
                >
                  {formatLabel(s)}
                </button>
              );
            })}
          </div>
          <FormField label="Remarks" className="mt-4">
            <TextArea value={form.remarks} onChange={(v) => set("remarks", v)} placeholder="Notes about this lead" />
          </FormField>
        </FormSection>
      </FormShell>
    </form>
  );
}
