"use client";

import { FormEvent, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { formatDateTime, formatLabel } from "@/lib/format";
import { TICKET_STATUSES } from "@/lib/types";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { CustomerDetailSkeleton } from "@/components/ui/skeleton";
import { FormField, SelectInput, TextArea } from "@/components/ui/form-field";

type TicketDetail = Record<string, unknown> & {
  comments?: Array<Record<string, unknown> & { user?: { name?: string } }>;
};

export default function SupportTicketDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, error: loadError } = useQuery({
    queryKey: ["support-ticket", id],
    queryFn: async () => {
      const res = await api.get<TicketDetail>(`/support/tickets/${id}`);
      return res.data;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["support-ticket", id] });
    queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
  };

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await api.patch(`/support/tickets/${id}`, { status });
      return res.data;
    },
    onSuccess: invalidate,
    onError: (err) => {
      const message = isAxiosError(err)
        ? (err.response?.data as { message?: string | string[] })?.message ?? err.message
        : "Failed to update status";
      setError(Array.isArray(message) ? message.join(", ") : String(message));
    },
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/support/tickets/${id}/comments`, {
        body: comment.trim(),
        isInternal,
      });
      return res.data;
    },
    onSuccess: () => {
      invalidate();
      setComment("");
      setIsInternal(false);
      setError(null);
    },
    onError: (err) => {
      const message = isAxiosError(err)
        ? (err.response?.data as { message?: string | string[] })?.message ?? err.message
        : "Failed to add comment";
      setError(Array.isArray(message) ? message.join(", ") : String(message));
    },
  });

  if (isLoading) {
    return <CustomerDetailSkeleton />;
  }
  if (loadError || !data) {
    return <p className="text-sm text-red-500">Ticket not found</p>;
  }

  function handleComment(e: FormEvent) {
    e.preventDefault();
    setError(null);
    commentMutation.mutate();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={String(data.subject ?? "Support ticket")}
        description={`#${String(data.ticketNumber ?? "")} · ${formatLabel(String(data.priority ?? "—"))} · ${formatLabel(String(data.status ?? "—"))}`}
        action={
          <Link href="/support" className="text-sm text-primary hover:underline">
            ← Back to support
          </Link>
        }
      />

      {error ? <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p> : null}

      <GlassCard className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium text-muted-foreground">Change status:</span>
        <div className="w-48">
          <SelectInput
            value={String(data.status ?? "")}
            onChange={(v) => statusMutation.mutate(v)}
            options={TICKET_STATUSES.map((s) => ({ value: s, label: formatLabel(s) }))}
          />
        </div>
        {statusMutation.isPending ? <span className="text-xs text-muted-foreground">Updating…</span> : null}
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <h3 className="mb-3 text-sm font-semibold">Description</h3>
          <p className="text-sm whitespace-pre-wrap">{String(data.description ?? "—")}</p>
          <dl className="mt-4 space-y-2 border-t border-border/40 pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Created</dt>
              <dd>{formatDateTime(data.createdAt)}</dd>
            </div>
            {data.slaDeadline ? (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">SLA deadline</dt>
                <dd>{formatDateTime(data.slaDeadline)}</dd>
              </div>
            ) : null}
          </dl>
        </GlassCard>

        <GlassCard>
          <h3 className="mb-3 text-sm font-semibold">Comments</h3>
          <ul className="mb-4 max-h-64 space-y-3 overflow-y-auto text-sm">
            {(data.comments ?? []).map((c) => (
              <li key={String(c.id)} className="border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.user?.name ?? "User"}</span>
                  {c.isInternal ? (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">Internal</span>
                  ) : null}
                </div>
                <p className="mt-1 whitespace-pre-wrap">{String(c.body ?? "")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(c.createdAt)}</p>
              </li>
            ))}
            {!data.comments?.length ? <li className="text-muted-foreground">No comments yet</li> : null}
          </ul>
          <form onSubmit={handleComment} className="space-y-3 border-t border-border/40 pt-3">
            <FormField label="Add comment">
              <TextArea value={comment} onChange={setComment} required placeholder="Reply to this ticket" />
            </FormField>
            <label className="flex cursor-pointer items-center gap-2 text-xs">
              <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
              Internal note (not visible to customer)
            </label>
            <button
              type="submit"
              disabled={commentMutation.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {commentMutation.isPending ? "Posting…" : "Post comment"}
            </button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
