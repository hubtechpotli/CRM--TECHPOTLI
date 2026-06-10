import { cn } from "@/lib/utils";

export type DataColumn<T> = {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
};

function cellValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function TableSkeleton({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <div className="space-y-1.5 p-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: columns }).map((__, j) => (
            <div key={j} className="h-9 flex-1 animate-pulse rounded-lg bg-muted/80" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  emptyMessage = "No records found.",
  emptyState,
  loading = false,
  onRowClick,
}: {
  columns: DataColumn<T>[];
  rows: T[];
  emptyMessage?: string;
  emptyState?: React.ReactNode;
  loading?: boolean;
  onRowClick?: (row: T) => void;
}) {
  if (loading) {
    return <TableSkeleton columns={columns.length} />;
  }

  if (rows.length === 0) {
    if (emptyState) return <>{emptyState}</>;
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/50">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="sticky top-0 z-[1] bg-muted/50 backdrop-blur-sm">
          <tr className="border-b border-border/60 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {columns.map((col) => (
              <th key={col.key} className={cn("px-4 py-2.5", col.className)}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={(row.id as string) ?? i}
              className={cn(
                "border-b border-border/30 transition-colors last:border-0",
                i % 2 === 0 ? "bg-card" : "bg-muted/20",
                onRowClick ? "cursor-pointer hover:bg-primary/5" : "hover:bg-muted/40",
              )}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn("px-4 py-2.5", col.className)}>
                  {col.render
                    ? col.render(row)
                    : cellValue(row[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
