"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { appendListItem, createTempId, patchListItem } from "@/lib/optimistic-mutation";
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
import { type GlobalWorkItem, type TeamFeedResponse } from "@/lib/team-updates";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, normalizePaginated } from "@/lib/pagination";
import { fetchCustomersDirectory } from "@/lib/customers-directory";
import { useAssignees } from "@/hooks/use-users";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import { toast } from "sonner";
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

type CreateWorkItemPayload = {
  customerId: string;
  title: string;
  description?: string;
  category: string;
  assignedToId?: string;
  projectId?: string;
  dueDate?: string;
};

const emptyForm = {
  customerId: "",
  title: "",
  description: "",
  category: "GENERAL",
  assignedToId: "",
  projectId: "",
  dueDate: "",
};

function teamInvalidateKeys(customerId?: string) {
  const keys: (readonly string[])[] = [["team-updates-feed"], ["team-updates-summary"]];
  if (customerId) keys.push(["customer-work-items", customerId]);
  return keys;
}

function resolveCustomerId(item: GlobalWorkItem): string {
  return String(item.customerId ?? item.customer?.id ?? "").trim();
}

function WorkItemUpdatesThread({
  customerId,
  itemId,
  fallback,
}: {
  customerId: string;
  itemId: string;
  fallback: GlobalWorkItem["updates"];
}) {
  const { data: loaded } = useQuery({
    queryKey: ["work-item-updates", customerId, itemId],
    queryFn: async () => {
      const res = await api.get<Array<Record<string, unknown>>>(
        `/team-updates/work-items/${customerId}/${itemId}/updates`,
      );
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: Boolean(customerId && itemId),
  });

  const updates = (loaded?.length ? loaded : fallback) ?? [];

  return (
    <div className="mt-3 space-y-2 border-t border-border/40 pt-3">
      {updates.map((u) => {
        const authorName = (u.author as { name?: string })?.name ?? "Team member";
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
          </div>
        );
      })}
    </div>
  );
}

export function TeamUpdatesFeed({ compact = false, take }: { compact?: boolean; take?: number }) {
  const queryClient = useQueryClient();
  const { authReady } = useAuthReady();
  const { data: assignees = [] } = useAssignees();

  const [statusFilter, setStatusFilter] = useState("open");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<"" | "today" | "7d" | "30d">("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const debouncedSearch = useDebouncedValue(search, 300);
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

  const dateParams = (() => {
    if (!dateRange) return {};
    const now = new Date();
    const to = now.toISOString();
    if (dateRange === "today") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { from: start.toISOString(), to };
    }
    if (dateRange === "7d") {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { from: start.toISOString(), to };
    }
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return { from: start.toISOString(), to };
  })();

  const feedParams = (() => {
    const p: Record<string, string> = {};
    if (compact && take) {
      p.limit = String(take);
      p.page = "1";
    } else {
      p.limit = String(pageSize);
      p.page = String(page);
    }
    if (debouncedSearch.trim()) p.q = debouncedSearch.trim();
    if (filterEmployee) p.createdById = filterEmployee;
    if (filterCustomer) p.customerId = filterCustomer;
    if (filterProject) p.projectId = filterProject;
    Object.assign(p, dateParams);
    if (statusFilter === "all") p.openOnly = "0";
    else if (statusFilter === "mine") p.mine = "1";
    else if (statusFilter === "unassigned") p.unassigned = "1";
    else if (statusFilter === "OPEN" || statusFilter === "IN_PROGRESS") {
      p.status = statusFilter;
      p.openOnly = "0";
    }
    return p;
  })();

  const queryKey = ["team-updates-feed", statusFilter, page, pageSize, debouncedSearch, dateRange, filterEmployee, filterCustomer, filterProject, take, compact];

  const { data: feedPage, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await api.get<TeamFeedResponse | GlobalWorkItem[]>("/team-updates/feed", { params: feedParams });
      return normalizePaginated<GlobalWorkItem>(res.data);
    },
    enabled: authReady,
  });

  const items = feedPage?.data ?? [];

  const { data: filterCustomers = [] } = useQuery({
    queryKey: ["customers-directory-filter"],
    queryFn: async () => {
      const data = await fetchCustomersDirectory<{ id: string; companyName?: string }>({ limit: 100 });
      return data.items;
    },
    enabled: authReady && !compact,
  });

  const { data: filterProjects = [] } = useQuery({
    queryKey: ["projects-filter", filterCustomer],
    queryFn: async () => {
      const res = await api.get("/projects", {
        params: { limit: 100, ...(filterCustomer ? { customerId: filterCustomer } : {}) },
      });
      return normalizePaginated<{ id: string; name?: string }>(res.data).data;
    },
    enabled: authReady && !compact,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-directory-quick"],
    queryFn: async () => {
      const data = await fetchCustomersDirectory<{ id: string; companyName?: string }>({ limit: 100 });
      return data.items;
    },
    enabled: authReady && showForm && !compact,
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

  const createMutation = useOptimisticMutation({
    mutationFn: async (payload: CreateWorkItemPayload) => {
      const res = await api.post(`/customers/${payload.customerId}/work-items`, {
        title: payload.title,
        description: payload.description,
        category: payload.category,
        assignedToId: payload.assignedToId,
        projectId: payload.projectId,
        dueDate: payload.dueDate,
      });
      return res.data;
    },
    snapshotKeys: [queryKey],
    invalidateKeys: (payload) => teamInvalidateKeys(payload.customerId),
    onMutate: (payload) => {
      appendListItem(queryClient, queryKey, {
        id: createTempId(),
        title: payload.title,
        status: "OPEN",
        category: payload.category,
        customerId: payload.customerId,
        customer: { id: payload.customerId },
        createdAt: new Date().toISOString(),
      });
      setShowForm(false);
      setFormError(null);
      setForm(emptyForm);
    },
    onError: (err) => setFormError(mutationError(err)),
  });

  const statusMutation = useOptimisticMutation({
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
    snapshotKeys: [queryKey],
    invalidateKeys: ({ customerId }) => teamInvalidateKeys(customerId),
    onMutate: ({ itemId, status }) => {
      patchListItem(queryClient, queryKey, itemId, { status });
    },
  });

  const updateMutation = useOptimisticMutation({
    mutationFn: async ({ customerId, itemId, body }: { customerId: string; itemId: string; body: string }) => {
      const res = await api.post(`/customers/${customerId}/work-items/${itemId}/updates`, { body });
      return res.data;
    },
    snapshotKeys: [queryKey],
    invalidateKeys: ({ customerId }) => teamInvalidateKeys(customerId),
    onMutate: ({ itemId }) => {
      setUpdateText((prev) => ({ ...prev, [itemId]: "" }));
    },
  });

  const canManage = (item: GlobalWorkItem) => {
    const s = String(item.status ?? "OPEN");
    return s !== "COMPLETED" && s !== "CANCELLED";
  };

  const displayItems = items;

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
    createMutation.mutate({
      customerId: form.customerId,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      category: form.category,
      assignedToId: form.assignedToId || undefined,
      projectId: form.projectId || undefined,
      dueDate: form.dueDate || undefined,
    });
  };

  function mutateStatus(item: GlobalWorkItem, status: string, note?: string) {
    const customerId = resolveCustomerId(item);
    if (!customerId) {
      toast.error("Missing customer for this work item. Refresh the page.");
      return;
    }
    statusMutation.mutate({ customerId, itemId: item.id, status, note });
  }

  function mutateUpdate(item: GlobalWorkItem, body: string) {
    const customerId = resolveCustomerId(item);
    if (!customerId) {
      toast.error("Missing customer for this work item. Refresh the page.");
      return;
    }
    updateMutation.mutate({ customerId, itemId: item.id, body });
  }

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

          <div className="flex flex-wrap gap-3">
            <TextInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Search company, poster, project…"
            />
            <SelectInput
              value={dateRange}
              onChange={(v) => {
                setDateRange(v as typeof dateRange);
                setPage(1);
              }}
              placeholder="Any time"
              options={[
                { value: "", label: "Any time" },
                { value: "today", label: "Today" },
                { value: "7d", label: "Last 7 days" },
                { value: "30d", label: "Last 30 days" },
              ]}
            />
            <SelectInput
              value={filterEmployee}
              onChange={(v) => {
                setFilterEmployee(v);
                setPage(1);
              }}
              placeholder="Posted by"
              options={[{ value: "", label: "Anyone" }, ...assignees.map((a) => ({ value: a.id, label: a.name }))]}
            />
            <SelectInput
              value={filterCustomer}
              onChange={(v) => {
                setFilterCustomer(v);
                setFilterProject("");
                setPage(1);
              }}
              placeholder="Customer"
              options={[
                { value: "", label: "All customers" },
                ...filterCustomers.map((c) => ({ value: c.id, label: String(c.companyName ?? c.id) })),
              ]}
            />
            <SelectInput
              value={filterProject}
              onChange={(v) => {
                setFilterProject(v);
                setPage(1);
              }}
              placeholder="Project"
              options={[
                { value: "", label: "All projects" },
                ...filterProjects.map((p) => ({ value: p.id, label: String(p.name ?? p.id) })),
              ]}
            />
          </div>

          <div className="flex flex-wrap gap-1">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.value);
                  setPage(1);
                }}
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
            const updateCount = (item as GlobalWorkItem & { _count?: { updates: number } })._count?.updates ?? (item.updates ?? []).length;
            const updates = item.updates ?? [];
            const status = String(item.status ?? "OPEN");
            const manage = canManage(item);
            const customerId = resolveCustomerId(item);

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
                        onClick={() => mutateStatus(item, "IN_PROGRESS", "Started working on this")}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted/50"
                      >
                        <PlayCircle className="h-3.5 w-3.5" />
                        Start work
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => mutateStatus(item, "COMPLETED", "Marked as completed")}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Complete
                    </button>
                  </div>
                ) : null}

                {!compact && updateCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setExpanded((e) => ({ ...e, [item.id]: !isOpen }))}
                    className="mt-3 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {updateCount} update{updateCount === 1 ? "" : "s"}
                  </button>
                ) : null}

                {!compact && isOpen ? (
                  <WorkItemUpdatesThread customerId={customerId} itemId={item.id} fallback={updates} />
                ) : null}

                {!compact && manage ? (
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
                      onClick={() => mutateUpdate(item, updateText[item.id] ?? "")}
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

      {!compact && feedPage && feedPage.totalCount > 0 ? (
        <PaginationFooter
          page={feedPage.page}
          totalPages={feedPage.totalPages}
          totalCount={feedPage.totalCount}
          limit={feedPage.limit}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            if (PAGE_SIZE_OPTIONS.includes(size as (typeof PAGE_SIZE_OPTIONS)[number])) {
              setPageSize(size);
              setPage(1);
            }
          }}
        />
      ) : null}
    </div>
  );
}
