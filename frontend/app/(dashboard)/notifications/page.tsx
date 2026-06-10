"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, normalizePaginated } from "@/lib/pagination";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CrmPageShell } from "@/components/dashboard/crm-page-shell";
import { SectionCard } from "@/components/dashboard/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import { ListPageSkeleton } from "@/components/ui/skeleton";
import { useRouteColor } from "@/hooks/use-route-color";

type Notification = {
  id: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
};

export default function NotificationsPage() {
  const routeColor = useRouteColor();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { authReady } = useAuthReady();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", page, pageSize],
    queryFn: async () => {
      const res = await api.get("/notifications", { params: { page, limit: pageSize } });
      return normalizePaginated<Notification>(res.data);
    },
    enabled: authReady,
    staleTime: 30_000,
  });

  const notifications = data?.data ?? [];
  const unread = notifications.filter((n) => !n.isRead);

  async function markRead(id: string) {
    await api.patch(`/notifications/${id}/read`);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["notifications-count"] });
  }

  async function markAllRead() {
    await api.patch("/notifications/read-all");
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["notifications-count"] });
  }

  async function handleClick(n: Notification) {
    if (!n.isRead) await markRead(n.id);
    if (n.link) router.push(n.link);
  }

  return (
    <CrmPageShell
      hideHeader
      title=""
      actions={
        unread.length > 0 ? (
          <button type="button" onClick={() => markAllRead()} className="crm-btn-ghost">
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        ) : null
      }
    >
      {isLoading ? (
        <ListPageSkeleton rows={6} columns={1} />
      ) : notifications.length === 0 ? (
        <SectionCard accent={routeColor}>
          <EmptyState
            icon={Bell}
            title="No notifications yet"
            description="Alerts for leads, projects, invoices, and team mentions will appear here."
          />
        </SectionCard>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => handleClick(n)}
              className={cn(
                "w-full rounded-xl border px-4 py-3 text-left transition hover:bg-muted/50",
                n.isRead ? "border-border/50 opacity-80" : "border-primary/30 bg-primary/5",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{n.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p>
                </div>
                {n.link ? <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
              </div>
            </button>
          ))}
          <PaginationFooter
            page={page}
            totalPages={data?.totalPages ?? 1}
            totalCount={data?.totalCount ?? 0}
            limit={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              if (PAGE_SIZE_OPTIONS.includes(size as (typeof PAGE_SIZE_OPTIONS)[number])) {
                setPageSize(size);
                setPage(1);
              }
            }}
          />
        </div>
      )}
    </CrmPageShell>
  );
}
