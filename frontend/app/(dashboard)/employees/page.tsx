"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { removeListItem } from "@/lib/optimistic-mutation";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { formatLabel } from "@/lib/format";
import { isSuperAdmin } from "@/lib/roles";
import { useAuthStore } from "@/store/auth-store";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { CrmPageShell } from "@/components/dashboard/crm-page-shell";
import { SectionCard } from "@/components/dashboard/section-card";
import { ListPageSkeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/dashboard/data-table";
import { ListActionButton } from "@/components/dashboard/list-actions";
import { Modal } from "@/components/ui/modal";
import { EmployeeForm } from "@/components/employees/employee-form";
import { useRouteColor } from "@/hooks/use-route-color";

type EmployeeRow = Record<string, unknown>;

export default function EmployeesPage() {
  const routeColor = useRouteColor();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const { authReady } = useAuthReady();
  const canDelete = isSuperAdmin(currentUser?.role);
  const [showNew, setShowNew] = useState(false);
  const [editEmployee, setEditEmployee] = useState<EmployeeRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await api.get<EmployeeRow[]>("/users");
      return res.data;
    },
    enabled: authReady,
    staleTime: 60_000,
  });

  const rows = Array.isArray(data) ? data : [];

  const deleteMutation = useOptimisticMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`);
    },
    snapshotKeys: [["employees"]],
    invalidateKeys: [["employees"]],
    onMutate: (id) => {
      removeListItem(queryClient, ["employees"], id);
      setDeleteError(null);
    },
    onError: (err) => {
      const message = isAxiosError(err)
        ? (err.response?.data as { message?: string | string[] })?.message ?? err.message
        : "Failed to delete employee";
      setDeleteError(Array.isArray(message) ? message.join(", ") : String(message));
    },
  });

  function handleDelete(row: EmployeeRow) {
    const name = String(row.name ?? "this employee");
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    deleteMutation.mutate(String(row.id));
  }

  return (
    <CrmPageShell
      hideHeader
      title=""
      actions={
        <button type="button" onClick={() => setShowNew(true)} className={routeColor.btn}>
          + New Employee
        </button>
      }
    >
      {deleteError ? (
        <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-600 dark:text-red-400">{deleteError}</p>
      ) : null}
      <SectionCard noPadding accent={routeColor} className="p-4">
        {isLoading ? (
          <ListPageSkeleton rows={6} columns={4} />
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-sm text-red-500">Failed to load employees</p>
            <button type="button" onClick={() => refetch()} className="mt-3 text-sm font-medium text-primary hover:underline">
              Retry
            </button>
          </div>
        ) : (
          <DataTable
            rows={rows}
            columns={[
              { key: "name", label: "Name" },
              { key: "email", label: "Email" },
              { key: "phone", label: "Phone" },
              {
                key: "role",
                label: "Role",
                render: (row) => (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {formatLabel(String(row.role ?? "—"))}
                  </span>
                ),
              },
              {
                key: "isActive",
                label: "Active",
                render: (row) => (row.isActive ? "Yes" : "No"),
              },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <div className="flex items-center gap-3">
                    <ListActionButton label="Edit" onClick={() => setEditEmployee(row)} />
                    {canDelete && String(row.id) !== currentUser?.id ? (
                      <ListActionButton
                        label="Delete"
                        variant="danger"
                        disabled={deleteMutation.isPending}
                        onClick={() => handleDelete(row)}
                      />
                    ) : null}
                  </div>
                ),
              },
            ]}
          />
        )}
      </SectionCard>
      <Modal open={showNew} onOpenChange={setShowNew} title="New employee" size="lg">
        <EmployeeForm onCancel={() => setShowNew(false)} onSuccess={() => setShowNew(false)} />
      </Modal>
      <Modal open={!!editEmployee} onOpenChange={(v) => !v && setEditEmployee(null)} title="Edit employee" size="lg">
        {editEmployee ? (
          <EmployeeForm
            employee={editEmployee}
            onCancel={() => setEditEmployee(null)}
            onSuccess={() => setEditEmployee(null)}
          />
        ) : null}
      </Modal>
    </CrmPageShell>
  );
}
