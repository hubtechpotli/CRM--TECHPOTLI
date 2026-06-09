import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-48" />
    </div>
  );
}

export function TabBarSkeleton({ tabs = 6 }: { tabs?: number }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-border p-0.5 w-fit">
      {Array.from({ length: tabs }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-20 rounded-md" />
      ))}
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-2xl border border-border/60 bg-card p-5", className)}>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-24 w-full rounded-lg" />
    </div>
  );
}

export function KpiRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-border/60 bg-card p-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-8 w-16" />
          <Skeleton className="mt-4 h-12 rounded" />
        </div>
      ))}
    </div>
  );
}

export function DashboardPageSkeleton() {
  return (
    <div className="space-y-6">
      <KpiRowSkeleton />
      <CardSkeleton className="h-32" />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="grid gap-6 lg:grid-cols-2">
            <CardSkeleton className="h-64" />
            <CardSkeleton className="h-64" />
          </div>
          <CardSkeleton className="h-72" />
        </div>
        <div className="space-y-6">
          <CardSkeleton className="h-80" />
          <CardSkeleton className="h-48" />
        </div>
      </div>
    </div>
  );
}

export function CustomerDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeaderSkeleton />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
      <TabBarSkeleton tabs={8} />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} className="h-36" />
        ))}
      </div>
    </div>
  );
}

export function LeadDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-28" />
      <div className="animate-pulse rounded-2xl border border-border/60 bg-card p-5 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
        <div className="grid gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <CardSkeleton className="h-64" />
        <CardSkeleton className="h-64" />
      </div>
    </div>
  );
}

export function ListPageSkeleton({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeaderSkeleton />
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-64 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <div className="flex gap-4 border-b border-border/60 px-4 py-3">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 border-b border-border/40 px-4 py-3 last:border-0">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AppShellSkeleton() {
  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className="flex shrink-0 flex-col border-r border-border bg-sidebar"
        style={{ width: "var(--sidebar-width)" }}
      >
        <div className="border-b border-white/10 px-5 py-5">
          <Skeleton className="h-8 w-32 bg-white/10" />
          <Skeleton className="mt-2 h-3 w-20 bg-white/10" />
        </div>
        <nav className="flex-1 space-y-5 p-3">
          {Array.from({ length: 4 }).map((_, g) => (
            <div key={g} className="space-y-2">
              <Skeleton className="mx-2 h-3 w-16 bg-white/10" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-lg bg-white/10" />
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-6">
          <Skeleton className="h-9 w-64 rounded-lg" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <DashboardPageSkeleton />
        </main>
      </div>
    </div>
  );
}
