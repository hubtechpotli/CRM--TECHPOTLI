"use client";

import { useMemo, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { api } from "@/lib/api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { fetchCustomersDirectory } from "@/lib/customers-directory";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, Plus, Users, X } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { SectionCard } from "@/components/dashboard/section-card";
import { StatusTabs } from "@/components/dashboard/status-tabs";
import { CustomerListTable, type CustomerRow } from "@/components/customers/customer-queue-list";
import { isTempId } from "@/lib/optimistic-mutation";
import { CustomerForm } from "@/components/customers/customer-form";
import { SelectInput } from "@/components/ui/form-field";
import { Modal } from "@/components/ui/modal";
import { useAssignees } from "@/hooks/use-users";
import { useAuthStore } from "@/store/auth-store";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { isAdmin, isSuperAdmin } from "@/lib/roles";
import { getApiErrorMessage } from "@/lib/api-error";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/lib/pagination";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { getRouteColor } from "@/lib/nav-colors";
import { MetricCard } from "@/components/dashboard/metric-card";
import { FEATURE } from "@/lib/feature-colors";

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "CHURNED", label: "Churned" },
];

export default function CustomersPage() {
  const pathname = usePathname();
  const routeColor = getRouteColor(pathname);
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { authReady } = useAuthReady();
  const adminView = isAdmin(user?.role);
  const canDelete = isSuperAdmin(user?.role);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteMutation = useOptimisticMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/customers/${id}`);
    },
    snapshotKeys: [["customers-directory"]],
    invalidateKeys: [["customers-directory"], ["customers"]],
    onMutate: () => setDeleteError(null),
    onError: (err) => {
      setDeleteError(getApiErrorMessage(err, "Failed to delete customer"));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers-directory"] });
    },
  });

  function handleDeleteCustomer(row: CustomerRow) {
    const name = String(row.companyName ?? "this customer");
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    deleteMutation.mutate(String(row.id));
  }
  const { data: assignees = [] } = useAssignees();

  const [search, setSearch] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const debouncedSearch = useDebouncedValue(search);

  const params = useMemo(
    () => ({
      q: debouncedSearch.trim() || undefined,
      status: statusFilter || undefined,
      assignedEmployeeId: assigneeFilter || undefined,
      page,
      limit: pageSize,
    }),
    [debouncedSearch, statusFilter, assigneeFilter, page, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, assigneeFilter, pageSize]);

  useEffect(() => {
    if (searchParams.get("new") === "1") setShowNewCustomer(true);
  }, [searchParams]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["customers-directory", params],
    queryFn: () => fetchCustomersDirectory<CustomerRow>(params),
    enabled: authReady,
    staleTime: 60_000,
  });

  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters = Boolean(statusFilter || assigneeFilter || search.trim());

  return (
    <div className="space-y-5">
      <PageToolbar
        hideTitle
        title=""
        search={
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search company, owner, phone…"
            className="min-w-[220px] sm:min-w-[280px]"
          />
        }
        actions={
          <button type="button" onClick={() => setShowNewCustomer(true)} className={routeColor.btn}>
            <Plus className="h-3.5 w-3.5" />
            New Customer
          </button>
        }
      />

      {deleteError ? (
        <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-600 dark:text-red-400">{deleteError}</p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Total customers" value={total} icon={Users} color={FEATURE.customers} />
        <MetricCard
          label="Current page"
          value={`${page} / ${totalPages}`}
          icon={Filter}
          color={routeColor}
          hint="Sorted newest first"
        />
        <MetricCard
          label="On this page"
          value={rows.length}
          icon={Users}
          color={FEATURE.month}
          hint={`Showing up to ${pageSize} records`}
        />
      </div>

      <SectionCard title="All customers" noPadding accent={routeColor}>
        <div className="space-y-4 border-b border-border/50 px-4 py-4 sm:px-5">
          <StatusTabs tabs={STATUS_TABS} value={statusFilter} onChange={setStatusFilter} accent={routeColor} />
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              Filters
            </span>
            {adminView ? (
              <div className="w-full max-w-xs sm:w-48">
                <SelectInput
                  value={assigneeFilter}
                  onChange={setAssigneeFilter}
                  placeholder="All team members"
                  options={assignees.map((a) => ({ value: a.id, label: a.name }))}
                />
              </div>
            ) : null}
            {hasFilters ? (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("");
                  setAssigneeFilter("");
                  setSearch("");
                }}
                className={cn("inline-flex items-center gap-1 text-xs text-primary hover:underline")}
              >
                <X className="h-3 w-3" />
                Clear all
              </button>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="py-12 text-center">
            <p className="text-sm text-red-500">Failed to load customers</p>
            <p className="mt-1 text-xs text-muted-foreground">{getApiErrorMessage(error)}</p>
            <button type="button" onClick={() => refetch()} className="mt-3 text-sm text-primary hover:underline">
              Retry
            </button>
          </div>
        ) : (
          <div className="overflow-hidden px-2 pb-2 sm:px-4">
            <CustomerListTable
              rows={rows}
              loading={isLoading}
              showAssignee={adminView}
              emptyMessage="No customers match your search. Add a new customer to get started."
              rowActions={
                canDelete
                  ? (row) => [
                      {
                        label: "Delete",
                        destructive: true,
                        onClick: () => handleDeleteCustomer(row),
                      },
                    ]
                  : undefined
              }
            />
            <PaginationFooter
              page={page}
              totalPages={totalPages}
              totalCount={total}
              limit={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                if (PAGE_SIZE_OPTIONS.includes(size as (typeof PAGE_SIZE_OPTIONS)[number])) {
                  setPageSize(size);
                  setPage(1);
                }
              }}
              className="border-t border-border/50 px-4 py-3"
            />
          </div>
        )}
      </SectionCard>

      <Modal open={showNewCustomer} onOpenChange={setShowNewCustomer} title="New customer" description="Create a customer profile" size="xl" accent="emerald">
        <CustomerForm
          onCancel={() => setShowNewCustomer(false)}
          onSuccess={(data) => {
            setShowNewCustomer(false);
            const id = String(data.id ?? "");
            if (id && !isTempId(id)) router.push(`/customers/${id}`);
          }}
        />
      </Modal>
    </div>
  );
}
