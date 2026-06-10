"use client";

import { FormEvent, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { appendListItem, createTempId, patchListItem } from "@/lib/optimistic-mutation";
import { isAxiosError } from "axios";
import { Filter, MessageSquarePlus, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import {
  optimisticBumpTeamSummary,
  type GlobalWorkItem,
  type TeamFeedResponse,
} from "@/lib/team-updates";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, normalizePaginated } from "@/lib/pagination";
import { useAssignees } from "@/hooks/use-users";
import {
  customerToOption,
  useCustomerDirectorySearch,
} from "@/hooks/use-customer-directory-search";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAuthStore } from "@/store/auth-store";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import { SelectInput } from "@/components/ui/form-field";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { CustomerOption } from "@/components/ui/customer-search-field";
import { FEATURE } from "@/lib/feature-colors";
import type { ComposeFormState } from "@/components/team-updates/team-update-compose";
import { PostUpdateModal, type PostSuccess } from "@/components/team-updates/post-update-modal";
import { TeamUpdateCard } from "@/components/team-updates/team-update-card";
import { MentionText } from "@/components/team-updates/mention-badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";

const FILTER_TABS = [
  { value: "open", label: "Open", color: FEATURE.open },
  { value: "mine", label: "Mine", color: FEATURE.mine },
  { value: "unassigned", label: "Unassigned", color: FEATURE.unassigned },
  { value: "IN_PROGRESS", label: "In progress", color: FEATURE.inProgress },
  { value: "all", label: "All", color: FEATURE.all },
] as const;

type CreateWorkItemPayload = {
  customerId: string;
  title: string;
  description?: string;
  category: string;
  assignedToId?: string;
  projectId?: string;
  dueDate?: string;
};

const emptyForm: ComposeFormState = {
  customerId: "",
  title: "",
  description: "",
  category: "GENERAL",
  assignedToId: "",
  projectId: "",
  dueDate: "",
};

function mutationError(err: unknown) {
  return isAxiosError(err)
    ? String((err.response?.data as { message?: string })?.message ?? "Action failed")
    : "Action failed";
}

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
  mentionUsers,
}: {
  customerId: string;
  itemId: string;
  fallback: GlobalWorkItem["updates"];
  mentionUsers: Array<{ id: string; name: string }>;
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
          <div key={String(u.id)} className="rounded-lg bg-muted/30 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <UserAvatar name={authorName} size="sm" />
                <span className="text-[10px] font-semibold">{authorName}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{formatDateTime(u.createdAt)}</span>
            </div>
            <p className="mt-1.5 whitespace-pre-wrap text-xs">
              <MentionText text={String(u.body)} users={mentionUsers} />
            </p>
          </div>
        );
      })}
    </div>
  );
}

export type TeamUpdatesFeedProps = {
  compact?: boolean;
  take?: number;
  statusFilter?: string;
  onStatusFilterChange?: (value: string) => void;
  dateRange?: "" | "today" | "7d" | "30d";
  onDateRangeChange?: (value: "" | "today" | "7d" | "30d") => void;
};

export function TeamUpdatesFeed({
  compact = false,
  take,
  statusFilter: controlledStatus,
  onStatusFilterChange,
  dateRange: controlledDateRange,
  onDateRangeChange,
}: TeamUpdatesFeedProps) {
  const queryClient = useQueryClient();
  const { authReady } = useAuthReady();
  const currentUser = useAuthStore((s) => s.user);
  const { data: assignees = [] } = useAssignees();
  const mentionUsers = assignees.map((a) => ({ id: a.id, name: a.name }));

  const [internalStatus, setInternalStatus] = useState("open");
  const [internalDateRange, setInternalDateRange] = useState<"" | "today" | "7d" | "30d">("");
  const statusFilter = controlledStatus ?? internalStatus;
  const setStatusFilter = onStatusFilterChange ?? setInternalStatus;
  const dateRange = controlledDateRange ?? internalDateRange;
  const setDateRange = onDateRangeChange ?? setInternalDateRange;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const debouncedSearch = useDebouncedValue(search, 300);
  const [filterCustomerSearch, setFilterCustomerSearch] = useState("");
  const [pinnedCustomer, setPinnedCustomer] = useState<{
    value: string;
    label: string;
    sublabel?: string;
  } | null>(null);
  const [pinnedFilterCustomer, setPinnedFilterCustomer] = useState<{
    value: string;
    label: string;
    sublabel?: string;
  } | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [postSuccess, setPostSuccess] = useState<PostSuccess | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [updateText, setUpdateText] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<ComposeFormState>(emptyForm);

  const activeFilterCount = [dateRange, filterEmployee, filterCustomer, filterProject].filter(Boolean).length;

  function closePostModal() {
    setShowModal(false);
    setPostSuccess(null);
    setForm(emptyForm);
    setFormError(null);
    setPinnedCustomer(null);
  }

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

  const queryKey = [
    "team-updates-feed",
    statusFilter,
    page,
    pageSize,
    debouncedSearch,
    dateRange,
    filterEmployee,
    filterCustomer,
    filterProject,
    take,
    compact,
  ];

  const { data: feedPage, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await api.get<TeamFeedResponse | GlobalWorkItem[]>("/team-updates/feed", { params: feedParams });
      return normalizePaginated<GlobalWorkItem>(res.data);
    },
    enabled: authReady,
    staleTime: 30_000,
  });

  const items = feedPage?.data ?? [];

  const {
    data: filterSearchData,
    isLoading: filterCustomersLoading,
    minChars: filterMinChars,
  } = useCustomerDirectorySearch(filterCustomerSearch, authReady && !compact && filtersOpen);

  const filterCustomerOptions = useMemo(() => {
    const items = filterSearchData?.items ?? [];
    const opts: CustomerOption[] = items.map(customerToOption);
    const pin =
      pinnedFilterCustomer?.value === filterCustomer
        ? pinnedFilterCustomer
        : filterCustomer
          ? opts.find((o) => o.value === filterCustomer)
          : null;
    if (pin && !opts.some((o) => o.value === pin.value)) {
      opts.unshift(pin);
    }
    return opts;
  }, [filterSearchData?.items, filterCustomer, pinnedFilterCustomer]);

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

  const { data: projects = [] } = useQuery<Array<{ id: string; name?: string }>>({
    queryKey: ["customer-projects", form.customerId],
    queryFn: async (): Promise<Array<{ id: string; name?: string }>> => {
      const res = await api.get<Array<{ id: string; name?: string }>>("/projects", {
        params: { customerId: form.customerId, limit: 100 },
      });
      if (Array.isArray(res.data)) return res.data;
      return (normalizePaginated(res.data).data ?? []) as Array<{ id: string; name?: string }>;
    },
    enabled: !compact && Boolean(form.customerId),
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
      const assignee = assignees.find((a) => a.id === payload.assignedToId);
      const customerName =
        pinnedCustomer?.value === payload.customerId ? pinnedCustomer.label : "Customer";

      appendListItem(queryClient, queryKey, {
        id: createTempId(),
        title: payload.title,
        description: payload.description,
        status: "OPEN",
        category: payload.category,
        customerId: payload.customerId,
        customer: {
          id: payload.customerId,
          companyName: customerName,
        },
        assignedTo: assignee ? { id: assignee.id, name: assignee.name } : undefined,
        createdBy: currentUser ? { id: currentUser.id, name: currentUser.name } : undefined,
        createdAt: new Date().toISOString(),
      });

      optimisticBumpTeamSummary(queryClient, {
        assignedToId: payload.assignedToId,
        currentUserId: currentUser?.id,
      });

      setPostSuccess({
        title: payload.title,
        customerName,
        assigneeName: assignee?.name,
        broadcastTeam: !payload.assignedToId,
      });
      setForm(emptyForm);
      setFormError(null);

      if (assignee) {
        toast.success(`${assignee.name} notified — they can start work.`);
      } else {
        toast.success("Posted — whole team notified.");
      }
    },
    onError: (err, payload) => {
      setPostSuccess(null);
      setShowModal(true);
      setForm({
        customerId: payload.customerId,
        title: payload.title,
        description: payload.description ?? "",
        category: payload.category,
        assignedToId: payload.assignedToId ?? "",
        projectId: payload.projectId ?? "",
        dueDate: payload.dueDate ?? "",
      });
      setFormError(mutationError(err));
    },
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
      setFormError("Missing customer for this work item. Refresh the page.");
      return;
    }
    statusMutation.mutate({ customerId, itemId: item.id, status, note });
  }

  function mutateUpdate(item: GlobalWorkItem, body: string) {
    const customerId = resolveCustomerId(item);
    if (!customerId) return;
    updateMutation.mutate({ customerId, itemId: item.id, body });
  }

  return (
    <div className="space-y-3">
      {!compact ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
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
                    "rounded-md px-2 py-1 text-[10px] font-semibold transition",
                    statusFilter === tab.value
                      ? cn(tab.color.solid, "text-white shadow-sm")
                      : cn(tab.color.light, tab.color.text, "hover:brightness-95"),
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative ml-auto w-full max-w-[200px] sm:w-44">
              <Search className="pointer-events-none absolute left-2 top-1/2 z-10 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search…"
                className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-2 text-xs outline-none focus:border-primary"
              />
            </div>

            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-[10px] font-semibold transition",
                filtersOpen || activeFilterCount > 0
                  ? "border-primary/40 bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              <SlidersHorizontal className="h-3 w-3" />
              Filters
              {activeFilterCount > 0 ? (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] text-primary-foreground">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="crm-btn-violet !px-2.5 !py-1.5 !text-[10px]"
            >
              <MessageSquarePlus className="h-3 w-3" />
              Post update
            </button>
          </div>

          {filtersOpen ? (
            <div className="grid gap-2 rounded-lg border border-border/50 bg-muted/20 p-2 sm:grid-cols-2 lg:grid-cols-4">
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
              <SearchableSelect
                value={filterCustomer}
                selectedOption={pinnedFilterCustomer}
                onOptionSelect={(opt) => {
                  setPinnedFilterCustomer(opt);
                  setFilterCustomer(opt.value);
                  setFilterProject("");
                  setPage(1);
                }}
                onChange={(v) => {
                  if (!v) {
                    setPinnedFilterCustomer(null);
                    setFilterCustomer("");
                    setFilterProject("");
                    setPage(1);
                  }
                }}
                options={filterCustomerOptions}
                onSearchChange={setFilterCustomerSearch}
                loading={filterCustomersLoading}
                minSearchLength={filterMinChars}
                placeholder="Filter by customer"
                searchHint="Type 2+ chars to search customers"
                emptyLabel="No match"
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
              {activeFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setDateRange("");
                    setFilterEmployee("");
                    setFilterCustomer("");
                    setFilterProject("");
                    setPinnedFilterCustomer(null);
                    setFilterCustomerSearch("");
                    setPage(1);
                  }}
                  className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline sm:col-span-2 lg:col-span-4"
                >
                  <Filter className="h-3 w-3" />
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : null}

          <PostUpdateModal
            open={showModal}
            onOpenChange={(v) => (v ? setShowModal(true) : closePostModal())}
            form={form}
            onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            onSubmit={handleSubmit}
            error={formError}
            pending={createMutation.isPending}
            success={postSuccess}
            onDone={closePostModal}
            assignees={assignees}
            onCustomerSelect={(opt) => setPinnedCustomer(opt)}
            selectedCustomerOption={pinnedCustomer}
            customerSearchEnabled={authReady && !compact && showModal}
            projectOptions={projects.map((p) => ({ value: p.id, label: String(p.name ?? p.id) }))}
          />
        </>
      ) : null}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-border/40 bg-muted/30" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div
          className={cn(
            "rounded-xl border border-dashed px-6 py-10 text-center",
            FEATURE.teamUpdates.border,
            FEATURE.teamUpdates.light,
          )}
        >
          <div
            className={cn(
              "mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-sm",
              FEATURE.teamUpdates.solid,
            )}
          >
            <MessageSquarePlus className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium">No team updates yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Post an update so your team stays in sync.</p>
          {!compact ? (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="crm-btn-violet mt-3 !px-3 !py-1.5 !text-xs"
            >
              Post first update
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const customerId = resolveCustomerId(item);
            const isOpen = expanded[item.id] ?? false;
            const updates = item.updates ?? [];

            return (
              <TeamUpdateCard
                key={item.id}
                item={item}
                customerId={customerId}
                currentUserId={currentUser?.id}
                mentionUsers={mentionUsers}
                expanded={isOpen}
                onToggleExpand={() => setExpanded((e) => ({ ...e, [item.id]: !isOpen }))}
                updateText={updateText[item.id] ?? ""}
                onUpdateTextChange={(v) => setUpdateText((prev) => ({ ...prev, [item.id]: v }))}
                onStart={() => mutateStatus(item, "IN_PROGRESS", "Started working on this")}
                onComplete={() => mutateStatus(item, "COMPLETED", "Marked as completed")}
                onAddUpdate={() => mutateUpdate(item, updateText[item.id] ?? "")}
                updatePending={updateMutation.isPending}
                statusPending={statusMutation.isPending}
                updatesSlot={
                  !compact && isOpen ? (
                    <WorkItemUpdatesThread
                      customerId={customerId}
                      itemId={item.id}
                      fallback={updates}
                      mentionUsers={mentionUsers}
                    />
                  ) : null
                }
              />
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
