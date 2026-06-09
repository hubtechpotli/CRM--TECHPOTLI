"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { removeListItem } from "@/lib/optimistic-mutation";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { formatDate, formatLabel } from "@/lib/format";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable } from "@/components/dashboard/data-table";
import { ListActionButton } from "@/components/dashboard/list-actions";
import { ListPageSkeleton } from "@/components/ui/skeleton";

type ApprovalRow = Record<string, unknown> & {
  requestedBy?: { name?: string };
};

export default function ApprovalsPage() {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["approvals-pending"],
    queryFn: async () => {
      const res = await api.get<ApprovalRow[]>("/approvals/pending");
      return res.data;
    },
  });

  const actionMutation = useOptimisticMutation({
    mutationFn: async ({ id, action, rejectionReason }: { id: string; action: "approve" | "reject"; rejectionReason?: string }) => {
      const res = await api.patch(`/approvals/${id}/${action}`, action === "reject" ? { rejectionReason } : undefined);
      return res.data;
    },
    snapshotKeys: [["approvals-pending"]],
    invalidateKeys: [["approvals-pending"]],
    onMutate: ({ id }) => {
      removeListItem(queryClient, ["approvals-pending"], id);
      setActionError(null);
    },
    onError: (err) => {
      const message = isAxiosError(err)
        ? (err.response?.data as { message?: string | string[] })?.message ?? err.message
        : "Action failed";
      setActionError(Array.isArray(message) ? message.join(", ") : String(message));
    },
  });

  const rows = Array.isArray(data) ? data : [];

  function handleReject(id: string) {
    const reason = prompt("Rejection reason (optional):");
    if (reason === null) return;
    actionMutation.mutate({ id, action: "reject", rejectionReason: reason || undefined });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Approvals" description="Pending approval requests for admin review." />
      {actionError ? (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{actionError}</p>
      ) : null}
      <GlassCard>
        {isLoading ? (
          <ListPageSkeleton rows={5} columns={4} />
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-sm text-red-500">Failed to load approvals</p>
            <button type="button" onClick={() => refetch()} className="mt-3 text-sm font-medium text-primary hover:underline">
              Retry
            </button>
          </div>
        ) : (
          <DataTable
            rows={rows}
            columns={[
              {
                key: "type",
                label: "Type",
                render: (row) => formatLabel(String(row.type ?? "—")),
              },
              { key: "module", label: "Module" },
              { key: "recordId", label: "Record ID" },
              {
                key: "requestedBy",
                label: "Requested by",
                render: (row) => row.requestedBy?.name ?? "—",
              },
              {
                key: "status",
                label: "Status",
                render: (row) => (
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                    {formatLabel(String(row.status ?? "PENDING"))}
                  </span>
                ),
              },
              {
                key: "createdAt",
                label: "Submitted",
                render: (row) => formatDate(row.createdAt),
              },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <div className="flex gap-2">
                    <ListActionButton
                      label="Approve"
                      variant="success"
                      disabled={actionMutation.isPending}
                      onClick={() => actionMutation.mutate({ id: String(row.id), action: "approve" })}
                    />
                    <ListActionButton
                      label="Reject"
                      variant="danger"
                      disabled={actionMutation.isPending}
                      onClick={() => handleReject(String(row.id))}
                    />
                  </div>
                ),
              },
            ]}
          />
        )}
      </GlassCard>
    </div>
  );
}
