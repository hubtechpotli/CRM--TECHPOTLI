"use client";

import { FormEvent, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { appendDetailListItem, createTempId, patchDetailItem } from "@/lib/optimistic-mutation";
import Link from "next/link";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { CustomerDetailSkeleton } from "@/components/ui/skeleton";
import { FormField, SelectInput, TextArea, TextInput } from "@/components/ui/form-field";
import { PROJECT_STATUSES } from "@/lib/types";

type Tab = "overview" | "comments" | "time-logs" | "work-order";

type ProjectDetail = Record<string, unknown> & {
  customer?: { id?: string; companyName?: string };
  workOrder?: { id?: string; workOrderNumber?: string; status?: string; acceptedAt?: string };
  comments?: Array<Record<string, unknown> & { user?: { name?: string } }>;
  timeLogs?: Array<Record<string, unknown> & { user?: { name?: string } }>;
};

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "work-order", label: "Work order" },
  { id: "comments", label: "Comments" },
  { id: "time-logs", label: "Time logs" },
];

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ProjectDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [comment, setComment] = useState("");
  const [timeLog, setTimeLog] = useState({ startTime: "", endTime: "", notes: "" });

  const { data, isLoading, error } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const res = await api.get<ProjectDetail>(`/projects/${id}`);
      return res.data;
    },
  });

  const projectKey = ["project", id] as const;

  const acceptMutation = useOptimisticMutation({
    mutationFn: async () => {
      const res = await api.patch(`/projects/${id}/work-order/accept`);
      return res.data;
    },
    snapshotKeys: [projectKey],
    invalidateKeys: [projectKey, ["projects"], ["projects-kanban"]],
    onMutate: () => {
      queryClient.setQueryData(projectKey, (old: ProjectDetail | undefined) => {
        if (!old) return old;
        const wo = (old.workOrder ?? {}) as Record<string, unknown>;
        return {
          ...old,
          workOrder: { ...wo, status: "ACCEPTED", acceptedAt: new Date().toISOString() },
        };
      });
    },
  });

  const statusMutation = useOptimisticMutation({
    mutationFn: async (status: string) => {
      const res = await api.patch(`/projects/${id}/status`, { status });
      return res.data;
    },
    snapshotKeys: [projectKey],
    invalidateKeys: [projectKey, ["projects"], ["projects-kanban"]],
    onMutate: (status) => {
      patchDetailItem(queryClient, projectKey, { status });
    },
  });

  const commentMutation = useOptimisticMutation({
    mutationFn: async (body: string) => {
      const res = await api.post(`/projects/${id}/comments`, { body });
      return res.data;
    },
    snapshotKeys: [projectKey],
    invalidateKeys: [projectKey],
    onMutate: (body) => {
      appendDetailListItem(queryClient, projectKey, "comments", {
        id: createTempId(),
        body,
        createdAt: new Date().toISOString(),
      });
      setComment("");
    },
  });

  const timeLogMutation = useOptimisticMutation({
    mutationFn: async () => {
      const res = await api.post(`/projects/${id}/time-logs`, {
        startTime: new Date(timeLog.startTime).toISOString(),
        endTime: timeLog.endTime ? new Date(timeLog.endTime).toISOString() : undefined,
        notes: timeLog.notes.trim() || undefined,
      });
      return res.data;
    },
    snapshotKeys: [projectKey],
    invalidateKeys: [projectKey],
    onMutate: () => {
      appendDetailListItem(queryClient, projectKey, "timeLogs", {
        id: createTempId(),
        startTime: timeLog.startTime,
        endTime: timeLog.endTime || null,
        notes: timeLog.notes.trim() || null,
      });
      setTimeLog({ startTime: "", endTime: "", notes: "" });
    },
  });

  if (isLoading) {
    return <CustomerDetailSkeleton />;
  }
  if (error || !data) {
    return <p className="text-sm text-red-500">Project not found</p>;
  }

  const wo = data.workOrder;
  const canAccept = wo?.status === "PENDING";
  const mutationError = (err: unknown) =>
    isAxiosError(err)
      ? String((err.response?.data as { message?: string })?.message ?? "Action failed")
      : "Action failed";

  return (
    <div className="space-y-6">
      <PageHeader
        title={String(data.name ?? "Project")}
        description={`${formatLabel(String(data.serviceType ?? "—"))} · ${formatLabel(String(data.status ?? "—"))} · ${Number(data.progress ?? 0)}% complete`}
        action={
          <div className="flex gap-3">
            {canAccept ? (
              <button
                type="button"
                onClick={() => acceptMutation.mutate()}
                disabled={acceptMutation.isPending}
                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground disabled:opacity-60"
              >
                {acceptMutation.isPending ? "Accepting…" : "Accept work order"}
              </button>
            ) : null}
            <Link href="/projects" className="text-sm text-primary hover:underline">
              ← Back to projects
            </Link>
          </div>
        }
      />

      <GlassCard className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium text-muted-foreground">Change status:</span>
        <SelectInput
          value={String(data.status ?? "")}
          onChange={(v) => v && statusMutation.mutate(v)}
          options={PROJECT_STATUSES.map((s) => ({ value: s, label: formatLabel(s) }))}
        />
        {statusMutation.isPending ? <span className="text-xs text-muted-foreground">Updating…</span> : null}
      </GlassCard>

      <div className="flex flex-wrap gap-1 rounded-lg border border-border p-0.5 text-xs w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-1.5 ${tab === t.id ? "bg-primary text-primary-foreground" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <GlassCard>
          <h3 className="mb-3 text-sm font-semibold">Overview</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Customer</dt>
              <dd>
                {data.customer?.id ? (
                  <Link href={`/customers/${data.customer.id}`} className="text-primary hover:underline">
                    {data.customer.companyName ?? "—"}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Priority</dt>
              <dd>{formatLabel(String(data.priority ?? "—"))}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Due date</dt>
              <dd>{data.dueDate ? new Date(String(data.dueDate)).toLocaleDateString() : "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Progress</dt>
              <dd>{Number(data.progress ?? 0)}%</dd>
            </div>
          </dl>
          {data.briefNotes ? (
            <div className="mt-4 border-t border-border/40 pt-3">
              <p className="text-xs font-medium text-muted-foreground">Brief notes</p>
              <p className="mt-1 text-sm">{String(data.briefNotes)}</p>
            </div>
          ) : null}
        </GlassCard>
      ) : null}

      {tab === "work-order" ? (
        <GlassCard>
          <h3 className="mb-3 text-sm font-semibold">Work order</h3>
          {acceptMutation.isError ? (
            <p className="mb-3 text-sm text-red-500">{mutationError(acceptMutation.error)}</p>
          ) : null}
          {wo ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Number</dt>
                <dd className="font-medium">{String(wo.workOrderNumber ?? "—")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {String(wo.status ?? "—")}
                  </span>
                </dd>
              </div>
              {wo.acceptedAt ? (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Accepted</dt>
                  <dd>{new Date(String(wo.acceptedAt)).toLocaleString()}</dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No work order attached</p>
          )}
        </GlassCard>
      ) : null}

      {tab === "comments" ? (
        <div className="space-y-4">
          <GlassCard>
            <h3 className="mb-3 text-sm font-semibold">Add comment</h3>
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                if (comment.trim()) commentMutation.mutate(comment.trim());
              }}
              className="space-y-3"
            >
              {commentMutation.isError ? (
                <p className="text-sm text-red-500">{mutationError(commentMutation.error)}</p>
              ) : null}
              <FormField label="Comment">
                <TextArea value={comment} onChange={setComment} required placeholder="Project update or note" />
              </FormField>
              <button
                type="submit"
                disabled={commentMutation.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {commentMutation.isPending ? "Posting…" : "Post comment"}
              </button>
            </form>
          </GlassCard>
          <GlassCard>
            <h3 className="mb-3 text-sm font-semibold">Comments</h3>
            <ul className="space-y-2 text-sm">
              {(data.comments ?? []).map((c) => (
                <li key={String(c.id)} className="border-b border-border/40 pb-2">
                  <p>{String(c.body ?? "")}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.user?.name ?? "User"} · {new Date(String(c.createdAt)).toLocaleString()}
                  </p>
                </li>
              ))}
              {!data.comments?.length ? <li className="text-muted-foreground">No comments yet</li> : null}
            </ul>
          </GlassCard>
        </div>
      ) : null}

      {tab === "time-logs" ? (
        <div className="space-y-4">
          <GlassCard>
            <h3 className="mb-3 text-sm font-semibold">Log time</h3>
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                timeLogMutation.mutate();
              }}
              className="space-y-3"
            >
              {timeLogMutation.isError ? (
                <p className="text-sm text-red-500">{mutationError(timeLogMutation.error)}</p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Start time">
                  <TextInput value={timeLog.startTime} onChange={(v) => setTimeLog((f) => ({ ...f, startTime: v }))} type="datetime-local" required />
                </FormField>
                <FormField label="End time">
                  <TextInput value={timeLog.endTime} onChange={(v) => setTimeLog((f) => ({ ...f, endTime: v }))} type="datetime-local" />
                </FormField>
              </div>
              <FormField label="Notes">
                <TextArea value={timeLog.notes} onChange={(v) => setTimeLog((f) => ({ ...f, notes: v }))} placeholder="What did you work on?" />
              </FormField>
              <button
                type="submit"
                disabled={timeLogMutation.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {timeLogMutation.isPending ? "Saving…" : "Log time"}
              </button>
            </form>
          </GlassCard>
          <GlassCard>
            <h3 className="mb-3 text-sm font-semibold">Time logs</h3>
            <ul className="space-y-2 text-sm">
              {(data.timeLogs ?? []).map((t) => (
                <li key={String(t.id)} className="border-b border-border/40 pb-2">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span>
                      {new Date(String(t.startTime)).toLocaleString()}
                      {t.endTime ? ` – ${new Date(String(t.endTime)).toLocaleString()}` : ""}
                    </span>
                    {t.durationMinutes != null ? (
                      <span className="text-muted-foreground">{Number(t.durationMinutes)} min</span>
                    ) : null}
                  </div>
                  {t.notes ? <p className="mt-1 text-muted-foreground">{String(t.notes)}</p> : null}
                  <p className="text-xs text-muted-foreground">{t.user?.name ?? "User"}</p>
                </li>
              ))}
              {!data.timeLogs?.length ? <li className="text-muted-foreground">No time logs yet</li> : null}
            </ul>
          </GlassCard>
        </div>
      ) : null}
    </div>
  );
}
