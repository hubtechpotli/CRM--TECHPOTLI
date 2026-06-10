"use client";

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/lib/pagination";

type Props = {
  page: number;
  totalPages: number;
  totalCount: number;
  limit?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
};

export function PaginationFooter({
  page,
  totalPages,
  totalCount,
  limit = DEFAULT_PAGE_SIZE,
  onPageChange,
  onPageSizeChange,
  className = "",
}: Props) {
  if (totalCount === 0) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, totalCount);

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 pt-4 text-sm ${className}`}>
      <p className="text-muted-foreground">
        Showing {start}–{end} of {totalCount} · newest first
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange ? (
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Per page
            <select
              value={limit}
              onChange={(e) => onPageSizeChange(Math.min(MAX_PAGE_SIZE, parseInt(e.target.value, 10)))}
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-medium text-foreground"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-muted"
        >
          Previous
        </button>
        <span className="text-xs text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-muted"
        >
          Next
        </button>
      </div>
    </div>
  );
}
