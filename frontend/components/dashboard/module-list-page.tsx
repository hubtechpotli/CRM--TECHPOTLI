"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataColumn, DataTable } from "@/components/dashboard/data-table";

type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

type ModuleListPageProps<T extends Record<string, unknown>> = {
  title: string;
  description?: string;
  endpoint: string;
  queryKey: string;
  columns: DataColumn<T>[];
  params?: Record<string, string | number | undefined>;
  enabled?: boolean;
  hideHeader?: boolean;
  paginated?: boolean;
  page?: number;
  onPageChange?: (page: number) => void;
  emptyState?: React.ReactNode;
  listHeader?: React.ReactNode;
  limit?: number;
};

export function ModuleListPage<T extends Record<string, unknown>>({
  title,
  description,
  endpoint,
  queryKey,
  columns,
  params,
  enabled = true,
  hideHeader = false,
  paginated = false,
  page = 1,
  onPageChange,
  emptyState,
  listHeader,
  limit = 50,
}: ModuleListPageProps<T>) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [queryKey, params, paginated ? page : null],
    enabled,
    queryFn: async () => {
      const res = await api.get<T[] | PaginatedResponse<T>>(endpoint, {
        params: paginated ? { ...params, page, limit } : params,
      });
      return res.data;
    },
  });

  const rows = paginated
    ? (data as PaginatedResponse<T> | undefined)?.items ?? []
    : Array.isArray(data)
      ? data
      : [];

  const total = paginated ? (data as PaginatedResponse<T> | undefined)?.total ?? 0 : rows.length;
  const totalPages = paginated ? Math.max(1, Math.ceil(total / limit)) : 1;
  const start = paginated ? (page - 1) * limit + 1 : 1;
  const end = paginated ? Math.min(page * limit, total) : rows.length;

  return (
    <div className="space-y-6">
      {!hideHeader ? <PageHeader title={title} description={description} /> : null}
      <GlassCard className="overflow-hidden p-0">
        {listHeader ? (
          <div className="border-b border-border/60 px-4 py-3">{listHeader}</div>
        ) : null}
        <div className="p-4">
          {error ? (
            <div className="py-8 text-center">
              <p className="text-sm text-red-500">
                {error instanceof Error ? error.message : "Failed to load data"}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-3 text-sm font-medium text-primary hover:underline"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <DataTable
                columns={columns}
                rows={rows}
                loading={isLoading}
                emptyState={emptyState}
              />
              {paginated && !isLoading && total > 0 ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 text-sm">
                  <p className="text-muted-foreground">
                    Showing {start}–{end} of {total}
                  </p>
                  {totalPages > 1 ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => onPageChange?.(page - 1)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={page >= totalPages}
                        onClick={() => onPageChange?.(page + 1)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
