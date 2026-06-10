"use client";

import { FormEvent, useEffect, useState } from "react";
import { useFormDraft } from "@/hooks/use-form-draft";
import { useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import {
  appendToMatchingLists,
  createTempId,
  patchDetailItem,
  replaceMatchingListItemId,
} from "@/lib/optimistic-mutation";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { Building2, Globe, Share2 } from "lucide-react";
import { FormField, SelectInput, TextArea, TextInput } from "@/components/ui/form-field";
import { FormFooterActions, FormShell } from "@/components/ui/form-shell";
import { FormSection } from "@/components/ui/form-section";
import { useAssignees } from "@/hooks/use-users";

type CustomerFormData = {
  companyName: string;
  ownerName: string;
  phone: string;
  email: string;
  alternatePhone: string;
  address: string;
  pincode: string;
  state: string;
  gstNumber: string;
  natureOfBusiness: string;
  domain: string;
  hosting: string;
  vercalLink: string;
  liveWebsiteLink: string;
  referenceWebsiteLink: string;
  facebookUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  remarks: string;
  assignedEmployeeId: string;
};

const emptyForm: CustomerFormData = {
  companyName: "",
  ownerName: "",
  phone: "",
  email: "",
  alternatePhone: "",
  address: "",
  pincode: "",
  state: "",
  gstNumber: "",
  natureOfBusiness: "",
  domain: "",
  hosting: "",
  vercalLink: "",
  liveWebsiteLink: "",
  referenceWebsiteLink: "",
  facebookUrl: "",
  instagramUrl: "",
  youtubeUrl: "",
  remarks: "",
  assignedEmployeeId: "",
};

function toFormData(customer?: Record<string, unknown>): CustomerFormData {
  if (!customer) return emptyForm;
  return {
    companyName: String(customer.companyName ?? ""),
    ownerName: String(customer.ownerName ?? ""),
    phone: String(customer.phone ?? ""),
    email: String(customer.email ?? ""),
    alternatePhone: String(customer.alternatePhone ?? ""),
    address: String(customer.address ?? ""),
    pincode: String(customer.pincode ?? ""),
    state: String(customer.state ?? ""),
    gstNumber: String(customer.gstNumber ?? ""),
    natureOfBusiness: String(customer.natureOfBusiness ?? ""),
    domain: String(customer.domain ?? ""),
    hosting: String(customer.hosting ?? ""),
    vercalLink: String(customer.vercalLink ?? ""),
    liveWebsiteLink: String(customer.liveWebsiteLink ?? ""),
    referenceWebsiteLink: String(customer.referenceWebsiteLink ?? ""),
    facebookUrl: String(customer.facebookUrl ?? ""),
    instagramUrl: String(customer.instagramUrl ?? ""),
    youtubeUrl: String(customer.youtubeUrl ?? ""),
    remarks: String(customer.remarks ?? ""),
    assignedEmployeeId: String(
      customer.assignedEmployeeId ?? (customer.assignedEmployee as { id?: string })?.id ?? ""
    ),
  };
}

export function CustomerForm({
  customer,
  onSuccess,
  onCancel,
}: {
  customer?: Record<string, unknown>;
  onSuccess?: (data: Record<string, unknown>) => void;
  onCancel?: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: assignees = [] } = useAssignees();
  const isEdit = !!customer?.id;
  const [editForm, setEditForm] = useState<CustomerFormData>(() => toFormData(customer));
  const { form: draftForm, setForm: setDraftForm, restored, discardDraft, clearDraft } = useFormDraft({
    draftKey: "customer:new",
    initial: emptyForm,
    enabled: !isEdit,
  });
  const form = isEdit ? editForm : draftForm;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit) setEditForm(toFormData(customer));
  }, [customer, isEdit]);

  function buildBody(payload: CustomerFormData) {
    const body: Record<string, unknown> = {
      companyName: payload.companyName.trim(),
      ownerName: payload.ownerName.trim(),
      phone: payload.phone.trim(),
      email: payload.email.trim() || undefined,
      alternatePhone: payload.alternatePhone.trim() || undefined,
      address: payload.address.trim() || undefined,
      pincode: payload.pincode.trim() || undefined,
      state: payload.state.trim() || undefined,
      gstNumber: payload.gstNumber.trim() || undefined,
      natureOfBusiness: payload.natureOfBusiness.trim() || undefined,
      domain: payload.domain.trim() || undefined,
      hosting: payload.hosting.trim() || undefined,
      vercalLink: payload.vercalLink.trim() || undefined,
      liveWebsiteLink: payload.liveWebsiteLink.trim() || undefined,
      referenceWebsiteLink: payload.referenceWebsiteLink.trim() || undefined,
      facebookUrl: payload.facebookUrl.trim() || undefined,
      instagramUrl: payload.instagramUrl.trim() || undefined,
      youtubeUrl: payload.youtubeUrl.trim() || undefined,
      remarks: payload.remarks.trim() || undefined,
    };
    if (payload.assignedEmployeeId) {
      body.assignedEmployee = { connect: { id: payload.assignedEmployeeId } };
    }
    return body;
  }

  const mutation = useOptimisticMutation({
    mutationFn: async (payload: CustomerFormData) => {
      const body = buildBody(payload);
      if (isEdit) {
        const res = await api.patch(`/customers/${customer!.id}`, body);
        return res.data;
      }
      const res = await api.post("/customers", body);
      return res.data;
    },
    snapshotKeys: () =>
      isEdit
        ? [["customer", String(customer!.id)], ["customers-directory"]]
        : [["customers-directory"]],
    invalidateKeys: [["customers-directory"], ["customers"], ["customer", String(customer?.id ?? "")]],
    onMutate: (payload) => {
      const body = buildBody(payload);
      if (isEdit) {
        const customerId = String(customer!.id);
        patchDetailItem(queryClient, ["customer", customerId], body);
        return {};
      }
      const tempId = createTempId();
      const optimistic = { id: tempId, ...body };
      appendToMatchingLists(queryClient, ["customers-directory"], optimistic);
      return { tempId };
    },
    onSuccess: (data, _vars, context) => {
      if (context?.tempId && data && typeof data === "object" && "id" in data) {
        replaceMatchingListItemId(
          queryClient,
          ["customers-directory"],
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
        : "Failed to save customer";
      setError(Array.isArray(message) ? message.join(", ") : String(message));
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate(form);
  }

  function set<K extends keyof CustomerFormData>(key: K, value: CustomerFormData[K]) {
    if (isEdit) setEditForm((prev) => ({ ...prev, [key]: value }));
    else setDraftForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormShell
        footer={
          <FormFooterActions
            onCancel={onCancel}
            submitLabel={isEdit ? "Update customer" : "Create customer"}
            pending={mutation.isPending}
          />
        }
      >
      {!isEdit && restored ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200/60 bg-emerald-50/80 px-3 py-2 text-sm">
          <span className="text-emerald-900/80">Draft restored</span>
          <button type="button" onClick={discardDraft} className="font-medium text-emerald-700 hover:underline">
            Discard draft
          </button>
        </div>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      ) : null}

      <div className="space-y-4">
        <FormSection title="Company & contact" description="Primary business details" icon={Building2} accent="indigo">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Company name">
              <TextInput value={form.companyName} onChange={(v) => set("companyName", v)} required />
            </FormField>
            <FormField label="Owner name">
              <TextInput value={form.ownerName} onChange={(v) => set("ownerName", v)} required />
            </FormField>
            <FormField label="Phone">
              <TextInput value={form.phone} onChange={(v) => set("phone", v)} type="tel" required />
            </FormField>
            <FormField label="Alternate phone">
              <TextInput value={form.alternatePhone} onChange={(v) => set("alternatePhone", v)} type="tel" />
            </FormField>
            <FormField label="Email">
              <TextInput value={form.email} onChange={(v) => set("email", v)} type="email" />
            </FormField>
            <FormField label="Assigned employee">
              <SelectInput
                value={form.assignedEmployeeId}
                onChange={(v) => set("assignedEmployeeId", v)}
                placeholder="Select assignee"
                options={assignees.map((a) => ({ value: a.id, label: a.name }))}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Address & business" accent="amber">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Address" className="sm:col-span-2">
              <TextArea value={form.address} onChange={(v) => set("address", v)} rows={2} />
            </FormField>
            <FormField label="State">
              <TextInput value={form.state} onChange={(v) => set("state", v)} />
            </FormField>
            <FormField label="Pincode">
              <TextInput value={form.pincode} onChange={(v) => set("pincode", v)} />
            </FormField>
            <FormField label="GST number">
              <TextInput value={form.gstNumber} onChange={(v) => set("gstNumber", v)} />
            </FormField>
            <FormField label="Nature of business">
              <TextInput value={form.natureOfBusiness} onChange={(v) => set("natureOfBusiness", v)} />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Web & hosting" icon={Globe} accent="cyan">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Domain">
              <TextInput value={form.domain} onChange={(v) => set("domain", v)} />
            </FormField>
            <FormField label="Hosting">
              <TextInput value={form.hosting} onChange={(v) => set("hosting", v)} />
            </FormField>
            <FormField label="Vercel link">
              <TextInput value={form.vercalLink} onChange={(v) => set("vercalLink", v)} type="url" />
            </FormField>
            <FormField label="Live website">
              <TextInput value={form.liveWebsiteLink} onChange={(v) => set("liveWebsiteLink", v)} type="url" />
            </FormField>
            <FormField label="Reference website" className="sm:col-span-2">
              <TextInput value={form.referenceWebsiteLink} onChange={(v) => set("referenceWebsiteLink", v)} type="url" />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Social & notes" icon={Share2} accent="rose">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Facebook URL">
              <TextInput value={form.facebookUrl} onChange={(v) => set("facebookUrl", v)} type="url" />
            </FormField>
            <FormField label="Instagram URL">
              <TextInput value={form.instagramUrl} onChange={(v) => set("instagramUrl", v)} type="url" />
            </FormField>
            <FormField label="YouTube URL" className="sm:col-span-2">
              <TextInput value={form.youtubeUrl} onChange={(v) => set("youtubeUrl", v)} type="url" />
            </FormField>
            <FormField label="Remarks" className="sm:col-span-2">
              <TextArea value={form.remarks} onChange={(v) => set("remarks", v)} rows={3} />
            </FormField>
          </div>
        </FormSection>
      </div>
      </FormShell>
    </form>
  );
}
