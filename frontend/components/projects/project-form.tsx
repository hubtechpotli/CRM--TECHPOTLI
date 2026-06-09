"use client";

import { FormEvent, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { appendToMatchingLists, createTempId, replaceMatchingListItemId } from "@/lib/optimistic-mutation";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { PROJECT_PRIORITIES, SERVICE_TYPES } from "@/lib/types";
import { FormField, SelectInput, TextArea, TextInput } from "@/components/ui/form-field";
import { useAssignees } from "@/hooks/use-users";

type ProjectFormData = {
  name: string;
  customerId: string;
  serviceType: string;
  priority: string;
  dueDate: string;
  designerId: string;
  frontendDevId: string;
  backendDevId: string;
  seoExecutiveId: string;
  briefNotes: string;
};

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ProjectForm({
  defaultCustomerId,
  onSuccess,
  onCancel,
}: {
  defaultCustomerId?: string;
  onSuccess?: (data: Record<string, unknown>) => void;
  onCancel?: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: assignees = [] } = useAssignees();
  const { data: customers = [] } = useQuery({
    queryKey: ["customers-directory", { q: undefined }],
    queryFn: async () => {
      const data = await import("@/lib/customers-directory").then((m) =>
        m.fetchCustomersDirectory({ limit: 500 }),
      );
      return data.items;
    },
  });

  const [form, setForm] = useState<ProjectFormData>({
    name: "",
    customerId: defaultCustomerId ?? "",
    serviceType: "WEBSITE_DEV",
    priority: "MEDIUM",
    dueDate: "",
    designerId: "",
    frontendDevId: "",
    backendDevId: "",
    seoExecutiveId: "",
    briefNotes: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultCustomerId) {
      setForm((prev) => ({ ...prev, customerId: defaultCustomerId }));
    }
  }, [defaultCustomerId]);

  const mutation = useOptimisticMutation({
    mutationFn: async (payload: ProjectFormData) => {
      const body: Record<string, unknown> = {
        name: payload.name.trim(),
        customerId: payload.customerId,
        serviceType: payload.serviceType,
        priority: payload.priority,
        dueDate: payload.dueDate ? new Date(payload.dueDate).toISOString() : undefined,
        briefNotes: payload.briefNotes.trim() || undefined,
      };
      if (payload.designerId) body.designerId = payload.designerId;
      if (payload.frontendDevId) body.frontendDevId = payload.frontendDevId;
      if (payload.backendDevId) body.backendDevId = payload.backendDevId;
      if (payload.seoExecutiveId) body.seoExecutiveId = payload.seoExecutiveId;
      const res = await api.post("/projects", body);
      return res.data;
    },
    snapshotKeys: [["projects"], ["projects-kanban"]],
    invalidateKeys: (payload) => [
      ["projects"],
      ["projects-kanban"],
      ["customer", payload.customerId],
    ],
    onMutate: (payload) => {
      const tempId = createTempId();
      const optimistic = {
        id: tempId,
        name: payload.name.trim(),
        status: "NEW",
        serviceType: payload.serviceType,
        priority: payload.priority,
      };
      appendToMatchingLists(queryClient, ["projects"], optimistic);
      onSuccess?.(optimistic);
      return { tempId };
    },
    onSuccess: (data, _vars, context) => {
      if (context?.tempId && data && typeof data === "object" && "id" in data) {
        replaceMatchingListItemId(
          queryClient,
          ["projects"],
          context.tempId,
          data as { id: string },
        );
      }
    },
    onError: (err) => {
      const message = isAxiosError(err)
        ? (err.response?.data as { message?: string | string[] })?.message ?? err.message
        : "Failed to create project";
      setError(Array.isArray(message) ? message.join(", ") : String(message));
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate(form);
  }

  function set<K extends keyof ProjectFormData>(key: K, value: ProjectFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const teamOptions = assignees.map((a) => ({ value: a.id, label: a.name }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Project name" className="sm:col-span-2">
          <TextInput value={form.name} onChange={(v) => set("name", v)} required />
        </FormField>
        <FormField label="Customer">
          <SelectInput
            value={form.customerId}
            onChange={(v) => set("customerId", v)}
            placeholder="Select customer"
            required
            disabled={!!defaultCustomerId}
            options={customers.map((c) => ({
              value: String(c.id),
              label: String(c.companyName ?? c.id),
            }))}
          />
        </FormField>
        <FormField label="Service type">
          <SelectInput
            value={form.serviceType}
            onChange={(v) => set("serviceType", v)}
            options={SERVICE_TYPES.map((s) => ({ value: s, label: formatLabel(s) }))}
          />
        </FormField>
        <FormField label="Priority">
          <SelectInput
            value={form.priority}
            onChange={(v) => set("priority", v)}
            options={PROJECT_PRIORITIES.map((p) => ({ value: p, label: formatLabel(p) }))}
          />
        </FormField>
        <FormField label="Due date">
          <TextInput value={form.dueDate} onChange={(v) => set("dueDate", v)} type="date" />
        </FormField>
        <FormField label="Designer">
          <SelectInput
            value={form.designerId}
            onChange={(v) => set("designerId", v)}
            placeholder="Optional"
            options={teamOptions}
          />
        </FormField>
        <FormField label="Frontend dev">
          <SelectInput
            value={form.frontendDevId}
            onChange={(v) => set("frontendDevId", v)}
            placeholder="Optional"
            options={teamOptions}
          />
        </FormField>
        <FormField label="Backend dev">
          <SelectInput
            value={form.backendDevId}
            onChange={(v) => set("backendDevId", v)}
            placeholder="Optional"
            options={teamOptions}
          />
        </FormField>
        <FormField label="SEO executive">
          <SelectInput
            value={form.seoExecutiveId}
            onChange={(v) => set("seoExecutiveId", v)}
            placeholder="Optional"
            options={teamOptions}
          />
        </FormField>
        <FormField label="Brief notes" className="sm:col-span-2">
          <TextArea value={form.briefNotes} onChange={(v) => set("briefNotes", v)} placeholder="Project scope and notes" />
        </FormField>
      </div>
      <div className="flex justify-end gap-2 pt-2">
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
          {mutation.isPending ? "Creating…" : "Create project"}
        </button>
      </div>
    </form>
  );
}
