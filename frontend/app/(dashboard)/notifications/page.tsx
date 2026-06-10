"use client";

import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { ListPageSkeleton } from "@/components/ui/skeleton";

type Notification = {
  id: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
};

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { authReady } = useAuthReady();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get<Notification[]>("/notifications");
      return res.data;
    },
    enabled: authReady,
  });

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
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Stay on top of leads, projects, invoices, and reminders."
        action={
          unread.length > 0 ? (
            <button
              type="button"
              onClick={markAllRead}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read ({unread.length})
            </button>
          ) : undefined
        }
      />

      <GlassCard className="p-0 overflow-hidden">
        {isLoading ? (
          <ListPageSkeleton rows={6} columns={3} />
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="font-medium">No notifications yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Assignments, invoices, and reminders will appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {notifications.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => handleClick(n)}
                  className={cn(
                    "group flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-primary/5",
                    !n.isRead && "bg-primary/[0.04]",
                    n.link ? "cursor-pointer" : "cursor-default"
                  )}
                >
                  <div
                    className={cn(
                      "mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      n.isRead ? "bg-muted" : "bg-primary/15 text-primary"
                    )}
                  >
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{n.title}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                    {n.link ? (
                      <span className="mt-2 inline-flex items-center gap-1 text-xs text-primary opacity-80 group-hover:opacity-100">
                        Open <ExternalLink className="h-3 w-3" />
                      </span>
                    ) : null}
                  </div>
                  {!n.isRead ? <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" /> : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
