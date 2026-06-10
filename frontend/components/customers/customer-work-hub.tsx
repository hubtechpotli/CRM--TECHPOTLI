"use client";

import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { appendListItem, createTempId, patchListItem } from "@/lib/optimistic-mutation";
import { isAxiosError } from "axios";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  MessageSquarePlus,
  PlayCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatDateTime, formatLabel } from "@/lib/format";
import { useAssignees } from "@/hooks/use-users";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";
import { FormField, SelectInput, TextArea, TextInput } from "@/components/ui/form-field";
import { UserAvatar } from "@/components/ui/user-avatar";

export type WorkItem = Record<string, unknown> & {
  id: string;
  title: string;
  description?: string;
  category?: string;
  status?: string;
  dueDate?: string;
  completedAt?: string;
  createdAt?: string;
  createdBy?: { id?: string; name?: string };
  assignedTo?: { id?: string; name?: string };
  project?: { id?: string; name?: string };
  updates?: Array<
    Record<string, unknown> & {
      body?: string;
      fromStatus?: string;
      toStatus?: string;
      createdAt?: string;
      author?: { name?: string };
    }
  >;
};

const CATEGORIES = [
  { value: "GENERAL", label: "General" },
  { value: "DOMAIN", label: "Domain" },
  { value: "HOSTING", label: "Hosting" },
  { value: "PROJECT", label: "Project" },
  { value: "PAYMENT", label: "Payment" },
  { value: "DOCUMENT", label: "Document" },
  { value: "OTHER", label: "Other" },
];

const FILTER_TABS = [
  { value: "", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "mine", label: "Mine" },
];

function statusStyles(status: string) {
  switch (status) {
    case "IN_PROGRESS":
      return "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-300";
    case "COMPLETED":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-300";
    case "CANCELLED":
      return "bg-slate-500/10 text-slate-600 border-slate-500/25";
    default:
      return "bg-primary/10 text-primary border-primary/25";
  }
}

function mutationError(err: unknown) {
  return isAxiosError(err)
    ? String((err.response?.data as { message?: string })?.message ?? "Action failed")
    : "Action failed";
}

export function CustomerWorkHub({
  customerId,
  compact = false,
  defaultCategory,
  onViewAll,
}: {
  customerId: string;
  compact?: boolean;
  defaultCategory?: string;
  onViewAll?: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: assignees = [] } = useAssignees();

  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [updateText, setUpdateText] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: defaultCategory ?? "GENERAL",
    assignedToId: "",
    projectId: "",
    dueDate: "",
  });

  const queryKey = ["customer-work-items", customerId, statusFilter];

  const { data: items = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter === "mine") params.mine = "1";
      else if (statusFilter) params.status = statusFilter;
      const res = await api.get<WorkItem[]>(`/customers/${customerId}/work-items`, { params });
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["customer-projects", customerId],
    queryFn: async () => {
      const res = await api.get<Array<{ id: string; name?: string }>>("/projects", { params: { customerId } });
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: showForm && !compact,
  });

  const displayItems = compact ? items.slice(0, 5) : items;

  const workInvalidateKeys = [
    ["customer-work-items", customerId],
    ["customer-timeline", customerId],
    ["customer-internal-notes", customerId],
    ["customers-directory"],
    ["team-updates-summary"],
  ] as const;

  const createMutation = useOptimisticMutation({
    mutationFn: async () => {
      const res = await api.post(`/customers/${customerId}/work-items`, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        assignedToId: form.assignedToId || undefined,
        projectId: form.projectId || undefined,
        dueDate: form.dueDate || undefined,
      });
      return res.data;
    },
    snapshotKeys: [queryKey],
    invalidateKeys: [...workInvalidateKeys],
    onMutate: () => {
      appendListItem(queryClient, queryKey, {
        id: createTempId(),
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        status: "OPEN",
        createdAt: new Date().toISOString(),
      });
      setShowForm(false);
      setFormError(null);
      setForm({
        title: "",
        description: "",
        category: defaultCategory ?? "GENERAL",
        assignedToId: "",
        projectId: "",
        dueDate: "",
      });
    },
    onError: (err) => setFormError(mutationError(err)),
  });

  const statusMutation = useOptimisticMutation({
    mutationFn: async ({ itemId, status, note }: { itemId: string; status: string; note?: string }) => {
      const res = await api.patch(`/customers/${customerId}/work-items/${itemId}/status`, { status, note });
      return res.data;
    },
    snapshotKeys: [queryKey],
    invalidateKeys: [...workInvalidateKeys],
    onMutate: ({ itemId, status }) => {
      patchListItem(queryClient, queryKey, itemId, { status });
    },
  });

  const updateMutation = useOptimisticMutation({
    mutationFn: async ({ itemId, body, toStatus }: { itemId: string; body: string; toStatus?: string }) => {
      const res = await api.post(`/customers/${customerId}/work-items/${itemId}/updates`, { body, toStatus });
      return res.data;
    },
    snapshotKeys: [queryKey],
    invalidateKeys: [...workInvalidateKeys],
    onMutate: ({ itemId, toStatus }) => {
      const patch: Record<string, unknown> = {};
      if (toStatus) patch.status = toStatus;
      patchListItem(queryClient, queryKey, itemId, patch);
      setUpdateText((prev) => ({ ...prev, [itemId]: "" }));
    },
  });

  const canManage = (item: WorkItem) => {
    const s = String(item.status ?? "OPEN");
    return s !== "COMPLETED" && s !== "CANCELLED";
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.title.trim()) {
      setFormError("Title is required");
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="space-y-4">
      {!compact ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Post updates for the whole team. Assign work, track status, and keep everyone in the loop.
            </p>
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              {showForm ? "Cancel" : "Post update"}
            </button>
          </div>

          <div className="flex flex-wrap gap-1">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                  statusFilter === tab.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {showForm ? (
            <GlassCard>
              <form onSubmit={handleSubmit} className="space-y-4">
                <FormField label="Title">
                  <TextInput
                    value={form.title}
                    onChange={(v) => setForm((f) => ({ ...f, title: v }))}
                    placeholder="e.g. Purchase domain, Logo change requested"
                    required
                  />
                </FormField>
                <FormField label="Details">
                  <TextArea
                    value={form.description}
                    onChange={(v) => setForm((f) => ({ ...f, description: v }))}
                    rows={3}
                    placeholder="Describe what needs to be done…"
                  />
                </FormField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Category">
                    <SelectInput
                      value={form.category}
                      onChange={(v) => setForm((f) => ({ ...f, category: v }))}
                      options={CATEGORIES}
                    />
                  </FormField>
                  <FormField label="Assign to">
                    <SelectInput
                      value={form.assignedToId}
                      onChange={(v) => setForm((f) => ({ ...f, assignedToId: v }))}
                      placeholder="Anyone on the team"
                      options={assignees.map((a) => ({ value: a.id, label: a.name }))}
                    />
                  </FormField>
                  <FormField label="Link project">
                    <SelectInput
                      value={form.projectId}
                      onChange={(v) => setForm((f) => ({ ...f, projectId: v }))}
                      placeholder="Optional"
                      options={projects.map((p) => ({
                        value: String(p.id),
                        label: String(p.name ?? p.id),
                      }))}
                    />
                  </FormField>
                  <FormField label="Due date">
                    <TextInput
                      type="date"
                      value={form.dueDate}
                      onChange={(v) => setForm((f) => ({ ...f, dueDate: v }))}
                    />
                  </FormField>
                </div>
                {formError ? <p className="text-sm text-red-500">{formError}</p> : null}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Post to team
                  </button>
                </div>
              </form>
            </GlassCard>
          ) : null}
        </>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading updates…</p>
      ) : displayItems.length === 0 ? (
        <GlassCard>
          <p className="text-sm font-medium">No team updates yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Post the first update so everyone knows what needs to be done.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {displayItems.map((item) => {
            const isOpen = expanded[item.id] ?? false;
            const updates = item.updates ?? [];
            const status = String(item.status ?? "OPEN");
            const manage = canManage(item);

            return (
              <GlassCard key={item.id} className="overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                          statusStyles(status),
                        )}
                      >
                        {formatLabel(status)}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        {formatLabel(String(item.category ?? "GENERAL"))}
                      </span>
                    </div>
                    <h4 className="mt-2 font-semibold">{item.title}</h4>
                    {item.description ? (
                      <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{item.description}</p>
                    ) : null}
                    {item.project?.name ? (
                      <p className="mt-1 text-xs text-primary">Project: {item.project.name}</p>
                    ) : null}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{formatDateTime(item.createdAt)}</p>
                    {item.dueDate ? (
                      <p className="mt-1 flex items-center justify-end gap-1">
                        <Clock className="h-3 w-3" />
                        Due {formatDateTime(item.dueDate)}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <UserAvatar name={item.createdBy?.name ?? "?"} size="sm" />
                    <span>Posted by {item.createdBy?.name ?? "—"}</span>
                  </div>
                  {item.assignedTo?.name ? (
                    <div className="flex items-center gap-1.5">
                      <UserAvatar name={item.assignedTo.name} size="sm" />
                      <span>Assigned to {item.assignedTo.name}</span>
                    </div>
                  ) : (
                    <span className="text-primary">Visible to all team</span>
                  )}
                </div>

                {!compact && manage && status !== "COMPLETED" && status !== "CANCELLED" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {status === "OPEN" ? (
                      <button
                        type="button"
                        onClick={() =>
                          statusMutation.mutate({
                            itemId: item.id,
                            status: "IN_PROGRESS",
                            note: "Started working on this",
                          })
                        }
                        disabled={statusMutation.isPending}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted/50"
                      >
                        <PlayCircle className="h-3.5 w-3.5" />
                        Start work
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() =>
                        statusMutation.mutate({
                          itemId: item.id,
                          status: "COMPLETED",
                          note: "Marked as completed",
                        })
                      }
                      disabled={statusMutation.isPending}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Mark complete
                    </button>
                  </div>
                ) : null}

                {!compact && updates.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setExpanded((e) => ({ ...e, [item.id]: !isOpen }))}
                    className="mt-3 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {updates.length} update{updates.length === 1 ? "" : "s"}
                  </button>
                ) : null}

                {!compact && isOpen ? (
                  <div className="mt-3 space-y-2 border-t border-border/40 pt-3">
                    {updates.map((u) => {
                      const authorName = u.author?.name ?? "Team member";
                      return (
                        <div key={String(u.id)} className="rounded-lg bg-muted/30 px-3 py-2 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <UserAvatar name={authorName} size="sm" />
                              <span className="text-xs font-semibold text-foreground">{authorName}</span>
                            </div>
                            <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(u.createdAt)}</span>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap">{String(u.body)}</p>
                          {u.toStatus ? (
                            <p className="mt-1 text-xs text-primary">→ {formatLabel(String(u.toStatus))}</p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {!compact && manage ? (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={updateText[item.id] ?? ""}
                      onChange={(e) => setUpdateText((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder="Add a progress note…"
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      disabled={!updateText[item.id]?.trim() || updateMutation.isPending}
                      onClick={() =>
                        updateMutation.mutate({
                          itemId: item.id,
                          body: updateText[item.id] ?? "",
                        })
                      }
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                ) : null}
              </GlassCard>
            );
          })}
        </div>
      )}

      {compact && items.length > 5 && onViewAll ? (
        <button type="button" onClick={onViewAll} className="text-sm font-medium text-primary hover:underline">
          View all {items.length} updates →
        </button>
      ) : null}
    </div>
  );
}

export function CustomerRecentUpdates({
  customerId,
  onViewAll,
}: {
  customerId: string;
  onViewAll: () => void;
}) {
  return (
    <GlassCard>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Recent team updates</h3>
        <button type="button" onClick={onViewAll} className="text-xs font-medium text-primary hover:underline">
          View all
        </button>
      </div>
      <CustomerWorkHub customerId={customerId} compact onViewAll={onViewAll} />
    </GlassCard>
  );
}
