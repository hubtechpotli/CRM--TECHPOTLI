"use client";

import { FormEvent, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import {
  appendToMatchingLists,
  createTempId,
  patchMatchingListItems,
  replaceMatchingListItemId,
} from "@/lib/optimistic-mutation";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { formatLabel } from "@/lib/format";
import { USER_ROLES } from "@/lib/types";
import { isSuperAdmin } from "@/lib/roles";
import { useAuthStore } from "@/store/auth-store";
import { FormField, SelectInput, TextInput } from "@/components/ui/form-field";
import { PasswordInput } from "@/components/ui/password-input";
import { ResetPasswordForm } from "@/components/profile/reset-password-form";

type EmployeeFormData = {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: string;
  department: string;
  designation: string;
  isActive: string;
  allowRemoteAccess: string;
};

const emptyForm: EmployeeFormData = {
  name: "",
  email: "",
  password: "",
  phone: "",
  role: "EMPLOYEE",
  department: "",
  designation: "",
  isActive: "true",
  allowRemoteAccess: "false",
};

function toFormData(employee?: Record<string, unknown>): EmployeeFormData {
  if (!employee) return emptyForm;
  return {
    name: String(employee.name ?? ""),
    email: String(employee.email ?? ""),
    password: "",
    phone: String(employee.phone ?? ""),
    role: String(employee.role ?? "EMPLOYEE"),
    department: String(employee.department ?? ""),
    designation: String(employee.designation ?? ""),
    isActive: employee.isActive === false ? "false" : "true",
    allowRemoteAccess: employee.allowRemoteAccess === true ? "true" : "false",
  };
}

export function EmployeeForm({
  employee,
  onSuccess,
  onCancel,
}: {
  employee?: Record<string, unknown>;
  onSuccess?: (data: Record<string, unknown>) => void;
  onCancel?: () => void;
}) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isEdit = !!employee?.id;
  const [form, setForm] = useState<EmployeeFormData>(() => toFormData(employee));
  const [error, setError] = useState<string | null>(null);
  const roleOptions = isSuperAdmin(currentUser?.role)
    ? USER_ROLES.map((r) => ({ value: r, label: formatLabel(r) }))
    : [{ value: "EMPLOYEE", label: formatLabel("EMPLOYEE") }];

  useEffect(() => {
    setForm(toFormData(employee));
  }, [employee]);

  const mutation = useOptimisticMutation({
    mutationFn: async (payload: EmployeeFormData) => {
      if (isEdit) {
        const res = await api.patch(`/users/${employee!.id}`, {
          name: payload.name.trim(),
          phone: payload.phone.trim() || undefined,
          role: payload.role,
          department: payload.department.trim() || undefined,
          designation: payload.designation.trim() || undefined,
          isActive: payload.isActive === "true",
          allowRemoteAccess: payload.allowRemoteAccess === "true",
        });
        return res.data;
      }
      const res = await api.post("/users", {
        name: payload.name.trim(),
        email: payload.email.trim(),
        password: payload.password,
        phone: payload.phone.trim() || undefined,
        role: payload.role,
        department: payload.department.trim() || undefined,
        designation: payload.designation.trim() || undefined,
      });
      return res.data;
    },
    snapshotKeys: [["employees"]],
    invalidateKeys: [["employees"]],
    onMutate: (payload) => {
      if (isEdit) {
        const employeeId = String(employee!.id);
        const patch = {
          name: payload.name.trim(),
          phone: payload.phone.trim() || undefined,
          role: payload.role,
          department: payload.department.trim() || undefined,
          designation: payload.designation.trim() || undefined,
          isActive: payload.isActive === "true",
        };
        patchMatchingListItems(queryClient, ["employees"], employeeId, patch);
        onSuccess?.({ id: employeeId, ...patch });
        return {};
      }
      const tempId = createTempId();
      const optimistic = {
        id: tempId,
        name: payload.name.trim(),
        email: payload.email.trim(),
        role: payload.role,
      };
      appendToMatchingLists(queryClient, ["employees"], optimistic);
      onSuccess?.(optimistic);
      return { tempId };
    },
    onSuccess: (data, _vars, context) => {
      if (context?.tempId && data && typeof data === "object" && "id" in data) {
        replaceMatchingListItemId(
          queryClient,
          ["employees"],
          context.tempId,
          data as { id: string },
        );
      }
    },
    onError: (err) => {
      const message = isAxiosError(err)
        ? (err.response?.data as { message?: string | string[] })?.message ?? err.message
        : "Failed to save employee";
      setError(Array.isArray(message) ? message.join(", ") : String(message));
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate(form);
  }

  function set<K extends keyof EmployeeFormData>(key: K, value: EmployeeFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-6">
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Name">
          <TextInput value={form.name} onChange={(v) => set("name", v)} required />
        </FormField>
        <FormField label="Email">
          <TextInput value={form.email} onChange={(v) => set("email", v)} type="email" required disabled={isEdit} />
        </FormField>
        {!isEdit ? (
          <FormField label="Password" className="sm:col-span-2">
            <PasswordInput value={form.password} onChange={(v) => set("password", v)} required />
            <p className="mt-1 text-xs text-muted-foreground">
              Min 8 chars with uppercase, number, and special character
            </p>
          </FormField>
        ) : null}
        <FormField label="Phone">
          <TextInput value={form.phone} onChange={(v) => set("phone", v)} type="tel" />
        </FormField>
        <FormField label="Role">
          <SelectInput value={form.role} onChange={(v) => set("role", v)} options={roleOptions} />
        </FormField>
        <FormField label="Department">
          <TextInput value={form.department} onChange={(v) => set("department", v)} />
        </FormField>
        <FormField label="Designation">
          <TextInput value={form.designation} onChange={(v) => set("designation", v)} />
        </FormField>
        {isEdit ? (
          <>
            <FormField label="Active">
              <SelectInput
                value={form.isActive}
                onChange={(v) => set("isActive", v)}
                options={[
                  { value: "true", label: "Yes" },
                  { value: "false", label: "No" },
                ]}
              />
            </FormField>
            <FormField label="Work from home (remote login)" className="sm:col-span-2">
              <SelectInput
                value={form.allowRemoteAccess}
                onChange={(v) => set("allowRemoteAccess", v)}
                options={[
                  { value: "false", label: "Office network only" },
                  { value: "true", label: "Allow remote login (requires 2FA)" },
                ]}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Remote access is only allowed when the employee has 2FA enabled.
              </p>
            </FormField>
          </>
        ) : null}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        {onCancel ? (
          <button type="button" onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-indigo-600 disabled:opacity-60"
        >
          {mutation.isPending ? "Saving…" : isEdit ? "Update employee" : "Create employee"}
        </button>
      </div>
    </form>
    {isEdit ? (
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
        <h3 className="mb-3 text-sm font-semibold">Reset password</h3>
        <ResetPasswordForm userId={String(employee!.id)} />
      </div>
    ) : null}
    </div>
  );
}
