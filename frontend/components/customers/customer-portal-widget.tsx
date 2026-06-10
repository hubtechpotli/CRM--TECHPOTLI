"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { appendListItem, createTempId, patchListItem } from "@/lib/optimistic-mutation";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { GlassCard } from "@/components/ui/glass-card";
import { formatDateTime } from "@/lib/format";

type PortalAccess = {
  id: string;
  token: string;
  isRevoked: boolean;
  visitCount: number;
  lastVisitedAt?: string;
  createdAt: string;
};

export function CustomerPortalWidget({ customerId }: { customerId: string }) {
  const queryClient = useQueryClient();

  const { data: accessList = [], isLoading } = useQuery({
    queryKey: ["customer-portal", customerId],
    queryFn: async () => {
      const res = await api.get<PortalAccess[]>(`/customers/${customerId}/portal`);
      return res.data;
    },
  });

  const activeAccess = accessList.find((a) => !a.isRevoked);
  const totalVisits = accessList.reduce((sum, a) => sum + (a.visitCount ?? 0), 0);

  const portalKey = ["customer-portal", customerId] as const;

  const createMutation = useOptimisticMutation({
    mutationFn: async () => {
      const res = await api.post<{ token: string }>(`/customers/${customerId}/portal`);
      return res.data;
    },
    snapshotKeys: [portalKey],
    invalidateKeys: [portalKey],
    onMutate: () => {
      appendListItem(queryClient, portalKey, {
        id: createTempId(),
        token: "…",
        isRevoked: false,
        visitCount: 0,
        createdAt: new Date().toISOString(),
      });
    },
    onSuccess: async (data) => {
      const url = `${window.location.origin}/portal/${data.token}`;
      await navigator.clipboard.writeText(url);
    },
  });

  const revokeMutation = useOptimisticMutation({
    mutationFn: async (accessId?: string) => {
      const res = await api.patch(`/customers/${customerId}/portal/revoke`, accessId ? { accessId } : {});
      return res.data;
    },
    snapshotKeys: [portalKey],
    invalidateKeys: [portalKey],
    onMutate: (accessId) => {
      if (accessId) {
        patchListItem(queryClient, portalKey, accessId, { isRevoked: true });
      } else {
        queryClient.setQueryData(portalKey, (old: PortalAccess[] | undefined) =>
          Array.isArray(old) ? old.map((a) => ({ ...a, isRevoked: true })) : old,
        );
      }
    },
  });

  const regenerateMutation = useOptimisticMutation({
    mutationFn: async () => {
      const res = await api.patch<{ token: string }>(`/customers/${customerId}/portal/regenerate`);
      return res.data;
    },
    snapshotKeys: [portalKey],
    invalidateKeys: [portalKey],
    onSuccess: async (data) => {
      const url = `${window.location.origin}/portal/${data.token}`;
      await navigator.clipboard.writeText(url);
    },
  });

  const mutationError = (err: unknown) =>
    isAxiosError(err)
      ? String((err.response?.data as { message?: string | string[] })?.message ?? err.message)
      : "Action failed";

  async function copyLink(token: string) {
    const url = `${window.location.origin}/portal/${token}`;
    await navigator.clipboard.writeText(url);
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading portal access…</p>;
  }

  return (
    <GlassCard>
      <h3 className="mb-3 text-sm font-semibold">Client portal</h3>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Status</dt>
          <dd>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                activeAccess ? "bg-green-500/15 text-green-700 dark:text-green-400" : "bg-muted text-muted-foreground"
              }`}
            >
              {activeAccess ? "Active" : "No active link"}
            </span>
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Total visits</dt>
          <dd>{totalVisits}</dd>
        </div>
        {activeAccess?.lastVisitedAt ? (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Last visit</dt>
            <dd>{formatDateTime(activeAccess.lastVisitedAt)}</dd>
          </div>
        ) : null}
        {activeAccess ? (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">This link visits</dt>
            <dd>{activeAccess.visitCount}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        {activeAccess ? (
          <button
            type="button"
            onClick={() => copyLink(activeAccess.token)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            Copy link
          </button>
        ) : (
          <button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
          >
            {createMutation.isPending ? "Creating…" : "Create portal link"}
          </button>
        )}
        {activeAccess ? (
          <>
            <button
              type="button"
              onClick={() => regenerateMutation.mutate()}
              disabled={regenerateMutation.isPending}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60"
            >
              {regenerateMutation.isPending ? "Regenerating…" : "Regenerate"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm("Revoke the active portal link?")) revokeMutation.mutate(activeAccess.id);
              }}
              disabled={revokeMutation.isPending}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-60"
            >
              {revokeMutation.isPending ? "Revoking…" : "Revoke"}
            </button>
          </>
        ) : null}
      </div>

      {createMutation.isError || regenerateMutation.isError || revokeMutation.isError ? (
        <p className="mt-3 text-xs text-red-500">
          {mutationError(createMutation.error ?? regenerateMutation.error ?? revokeMutation.error)}
        </p>
      ) : null}
      {createMutation.isSuccess || regenerateMutation.isSuccess ? (
        <p className="mt-3 text-xs text-green-600">Portal link copied to clipboard.</p>
      ) : null}
    </GlassCard>
  );
}
