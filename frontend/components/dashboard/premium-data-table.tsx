"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export type PremiumColumn<T> = {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
};

export type RowAction<T> = {
  label: string;
  onClick: (row: T) => void;
  destructive?: boolean;
};

function cellValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function TableSkeleton({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <div className="space-y-2 p-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: columns }).map((__, j) => (
            <div key={j} className="h-10 flex-1 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PremiumDataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  loading = false,
  emptyState,
  rowActions,
  footer,
  onRowClick,
}: {
  columns: PremiumColumn<T>[];
  rows: T[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  rowActions?: (row: T) => RowAction<T>[];
  footer?: React.ReactNode;
  onRowClick?: (row: T) => void;
}) {
  if (loading) return <TableSkeleton columns={columns.length + (rowActions ? 1 : 0)} />;

  if (rows.length === 0) {
    return emptyState ?? (
      <p className="py-10 text-center text-sm text-muted-foreground">No records found.</p>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border/60 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {columns.map((col) => (
                <th key={col.key} className={cn("px-4 py-3", col.className)}>
                  {col.label}
                </th>
              ))}
              {rowActions ? <th className="w-10 px-2 py-3" /> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const actions = rowActions?.(row) ?? [];
              return (
                <tr
                  key={(row.id as string) ?? i}
                  className={cn(
                    "border-b border-border/40 transition hover:bg-primary/[0.03]",
                    onRowClick && "cursor-pointer",
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-4 py-3.5", col.className)}>
                      {col.render ? col.render(row) : cellValue(row[col.key])}
                    </td>
                  ))}
                  {rowActions ? (
                    <td className="px-2 py-3.5" onClick={(e) => e.stopPropagation()}>
                      {actions.length > 0 ? (
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger asChild>
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Portal>
                            <DropdownMenu.Content
                              align="end"
                              className="z-50 min-w-[140px] rounded-xl border border-border bg-card p-1 shadow-lg"
                            >
                              {actions.map((action) => (
                                <DropdownMenu.Item
                                  key={action.label}
                                  onSelect={() => action.onClick(row)}
                                  className={cn(
                                    "cursor-pointer rounded-lg px-3 py-2 text-xs outline-none",
                                    action.destructive
                                      ? "text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
                                      : "focus:bg-muted",
                                  )}
                                >
                                  {action.label}
                                </DropdownMenu.Item>
                              ))}
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {footer ? <div className="border-t border-border/60 px-4 py-3">{footer}</div> : null}
    </div>
  );
}
