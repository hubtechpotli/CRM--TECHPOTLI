"use client";

import { FormEvent, useEffect, useState } from "react";
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
import { FormField, SelectInput, TextArea, TextInput } from "@/components/ui/form-field";
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
  const [form, setForm] = useState<CustomerFormData>(() => toFormData(customer));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(toFormData(customer));
  }, [customer]);

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
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      {error ? (
        <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <div className="space-y-6">
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Company & contact
          </h3>
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
        </section>

        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Address & business
          </h3>
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
        </section>

        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Web & hosting
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Domain">
              <TextInput value={form.domain} onChange={(v) => set("domain", v)} />
            </FormField>
            <FormField label="Hosting">
              <TextInput value={form.hosting} onChange={(v) => set("hosting", v)} />
            </FormField>
            <FormField label="Vercal link">
              <TextInput value={form.vercalLink} onChange={(v) => set("vercalLink", v)} type="url" />
            </FormField>
            <FormField label="Live website">
              <TextInput value={form.liveWebsiteLink} onChange={(v) => set("liveWebsiteLink", v)} type="url" />
            </FormField>
            <FormField label="Reference website" className="sm:col-span-2">
              <TextInput value={form.referenceWebsiteLink} onChange={(v) => set("referenceWebsiteLink", v)} type="url" />
            </FormField>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Social & notes
          </h3>
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
        </section>
      </div>

      <div className="sticky bottom-0 -mx-5 mt-4 flex justify-end gap-2 border-t border-border/50 bg-white/95 px-5 py-4 dark:bg-slate-900/95">
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
          {mutation.isPending ? "Saving…" : isEdit ? "Update customer" : "Create customer"}
        </button>
      </div>
    </form>
  );
}
