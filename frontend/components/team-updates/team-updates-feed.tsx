"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Loader2,
  MessageSquarePlus,
  PlayCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatDateTime, formatLabel } from "@/lib/format";
import { invalidateTeamUpdates, type GlobalWorkItem } from "@/lib/team-updates";
import { useAssignees } from "@/hooks/use-users";
import { useAuthStore } from "@/store/auth-store";
import { isAdmin } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";
import { FormField, SelectInput, TextArea, TextInput } from "@/components/ui/form-field";
import { UserAvatar } from "@/components/ui/user-avatar";

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
  { value: "open", label: "Open items" },
  { value: "all", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "mine", label: "Assigned to me" },
  { value: "unassigned", label: "Unassigned" },
];

function statusStyles(status: string) {
  switch (status) {
    case "IN_PROGRESS":
      return "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-300";
    case "COMPLETED":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-300";
    default:
      return "bg-primary/10 text-primary border-primary/25";
  }
}

function mutationError(err: unknown) {
  return isAxiosError(err)
    ? String((err.response?.data as { message?: string })?.message ?? "Action failed")
    : "Action failed";
}

export function TeamUpdatesFeed({ compact = false, take }: { compact?: boolean; take?: number }) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const admin = isAdmin(user?.role);
  const { data: assignees = [] } = useAssignees();

  const [statusFilter, setStatusFilter] = useState("open");
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [updateText, setUpdateText] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const [form, setForm] = useState({
    customerId: "",
    title: "",
    description: "",
    category: "GENERAL",
    assignedToId: "",
    projectId: "",
    dueDate: "",
  });

  const feedParams = (() => {
    const p: Record<string, string> = {};
    if (take) p.take = String(take);
    if (statusFilter === "all") p.openOnly = "0";
    else if (statusFilter === "mine") p.mine = "1";
    else if (statusFilter === "unassigned") p.unassigned = "1";
    else if (statusFilter === "OPEN" || statusFilter === "IN_PROGRESS") {
      p.status = statusFilter;
      p.openOnly = "0";
    }
    return p;
  })();

  const queryKey = ["team-updates-feed", statusFilter, take];

  const { data: items = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await api.get<GlobalWorkItem[]>("/team-updates/feed", { params: feedParams });
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-directory-quick"],
    queryFn: async () => {
      const data = await import("@/lib/customers-directory").then((m) =>
        m.fetchCustomersDirectory<{ id: string; companyName?: string }>({ limit: 500 }),
      );
      return data.items;
    },
    enabled: showForm && !compact,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["customer-projects", form.customerId],
    queryFn: async () => {
      const res = await api.get<Array<{ id: string; name?: string }>>("/projects", {
        params: { customerId: form.customerId },
      });
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: showForm && !compact && Boolean(form.customerId),
  });

  const invalidate = () => {
    invalidateTeamUpdates(queryClient);
    queryClient.invalidateQueries({ queryKey: ["customer-work-items"] });
    queryClient.invalidateQueries({ queryKey: ["customers-directory"] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/customers/${form.customerId}/work-items`, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        assignedToId: form.assignedToId || undefined,
        projectId: form.projectId || undefined,
        dueDate: form.dueDate || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      setFormError(null);
      setForm({
        customerId: "",
        title: "",
        description: "",
        category: "GENERAL",
        assignedToId: "",
        projectId: "",
        dueDate: "",
      });
    },
    onError: (err) => setFormError(mutationError(err)),
  });

  const statusMutation = useMutation({
    mutationFn: async ({
      customerId,
      itemId,
      status,
      note,
    }: {
      customerId: string;
      itemId: string;
      status: string;
      note?: string;
    }) => {
      const res = await api.patch(`/customers/${customerId}/work-items/${itemId}/status`, { status, note });
      return res.data;
    },
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ customerId, itemId, body }: { customerId: string; itemId: string; body: string }) => {
      const res = await api.post(`/customers/${customerId}/work-items/${itemId}/updates`, { body });
      return res.data;
    },
    onSuccess: (_, vars) => {
      invalidate();
      setUpdateText((prev) => ({ ...prev, [vars.itemId]: "" }));
    },
  });

  const canManage = (item: GlobalWorkItem) =>
    admin || item.createdBy?.id === user?.id || item.assignedTo?.id === user?.id;

  const displayItems = compact ? items.slice(0, take ?? 5) : items;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.customerId) {
      setFormError("Please select a customer");
      return;
    }
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
              All team updates across customers and projects — nothing gets missed.
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
                <FormField label="Customer">
                  <SelectInput
                    value={form.customerId}
                    onChange={(v) => setForm((f) => ({ ...f, customerId: v, projectId: "" }))}
                    placeholder="Select customer"
                    options={customers.map((c) => ({ value: c.id, label: c.companyName ?? c.id }))}
                  />
                </FormField>
                <FormField label="Title">
                  <TextInput
                    value={form.title}
                    onChange={(v) => setForm((f) => ({ ...f, title: v }))}
                    placeholder="e.g. Purchase domain, Logo change"
                    required
                  />
                </FormField>
                <FormField label="Details">
                  <TextArea
                    value={form.description}
                    onChange={(v) => setForm((f) => ({ ...f, description: v }))}
                    rows={3}
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
                      options={projects.map((p) => ({ value: p.id, label: p.name ?? p.id }))}
                    />
                  </FormField>
                  <FormField label="Due date">
                    <TextInput type="date" value={form.dueDate} onChange={(v) => setForm((f) => ({ ...f, dueDate: v }))} />
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
        <p className="text-sm text-muted-foreground">Loading team updates…</p>
      ) : displayItems.length === 0 ? (
        <GlassCard>
          <p className="text-sm font-medium">No team updates</p>
          <p className="mt-1 text-xs text-muted-foreground">Post an update so the whole team can see it.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {displayItems.map((item) => {
            const isOpen = expanded[item.id] ?? false;
            const updates = item.updates ?? [];
            const status = String(item.status ?? "OPEN");
            const manage = canManage(item);
            const customerId = String(item.customerId ?? item.customer?.id ?? "");

            return (
              <GlassCard key={item.id}>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/customers/${customerId}?tab=teamWork`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/15"
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    {item.customer?.companyName ?? "Customer"}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  {item.project?.name ? (
                    <Link
                      href={`/projects/${item.project.id}`}
                      className="text-xs text-muted-foreground hover:text-primary hover:underline"
                    >
                      Project: {item.project.name}
                    </Link>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", statusStyles(status))}>
                        {formatLabel(status)}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        {formatLabel(String(item.category ?? "GENERAL"))}
                      </span>
                    </div>
                    <h4 className="mt-2 font-semibold">{item.title}</h4>
                    {item.description ? (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{item.description}</p>
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
                    <span>{item.createdBy?.name ?? "—"}</span>
                  </div>
                  {item.assignedTo?.name ? (
                    <div className="flex items-center gap-1.5">
                      <UserAvatar name={item.assignedTo.name} size="sm" />
                      <span>→ {item.assignedTo.name}</span>
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
                            customerId,
                            itemId: item.id,
                            status: "IN_PROGRESS",
                            note: "Started working on this",
                          })
                        }
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
                          customerId,
                          itemId: item.id,
                          status: "COMPLETED",
                          note: "Marked as completed",
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Complete
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
                    {updates.map((u) => (
                      <div key={String(u.id)} className="rounded-lg bg-muted/30 px-3 py-2 text-sm">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{(u.author as { name?: string })?.name ?? "Team"}</span>
                          <span>{formatDateTime(u.createdAt)}</span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap">{String(u.body)}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {!compact ? (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={updateText[item.id] ?? ""}
                      onChange={(e) => setUpdateText((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder="Add progress note…"
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      disabled={!updateText[item.id]?.trim() || updateMutation.isPending}
                      onClick={() =>
                        updateMutation.mutate({ customerId, itemId: item.id, body: updateText[item.id] ?? "" })
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
    </div>
  );
}
