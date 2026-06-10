"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { useSocket } from "@/lib/socket-provider";
import { invalidateTeamUpdates } from "@/lib/team-updates";
import { DEFAULT_PAGE_SIZE, normalizePaginated } from "@/lib/pagination";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

type Notification = {
  id: string;
  title: string;
  message: string;
  type?: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
};

function invalidateNotifications(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["notifications-count"] });
  queryClient.invalidateQueries({ queryKey: ["notifications"] });
  invalidateTeamUpdates(queryClient);
}

export function NotificationBell() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const socket = useSocket();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const { data: count = 0 } = useQuery({
    queryKey: ["notifications-count"],
    enabled: !!accessToken,
    queryFn: async () => {
      const res = await api.get<number>("/notifications/unread-count");
      return typeof res.data === "number" ? res.data : 0;
    },
    refetchInterval: 60_000,
  });

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    enabled: !!accessToken && open,
    queryFn: async () => {
      const res = await api.get("/notifications", { params: { limit: DEFAULT_PAGE_SIZE } });
      return normalizePaginated<Notification>(res.data).data;
    },
  });

  useEffect(() => {
    if (!socket) return;
    const onNew = () => invalidateNotifications(queryClient);
    socket.on("notification", onNew);
    socket.on("work_order:new", onNew);
    socket.on("work_item:new", onNew);
    return () => {
      socket.off("notification", onNew);
      socket.off("work_order:new", onNew);
      socket.off("work_item:new", onNew);
    };
  }, [socket, queryClient]);

  async function markRead(id: string) {
    await api.patch(`/notifications/${id}/read`);
    invalidateNotifications(queryClient);
  }

  async function markAllRead() {
    await api.patch("/notifications/read-all");
    invalidateNotifications(queryClient);
  }

  async function handleClick(n: Notification) {
    if (!n.isRead) await markRead(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  const unreadInList = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative rounded-lg border border-border/60 p-2 transition hover:bg-white/60 dark:hover:bg-slate-800/60",
          open && "bg-white/80 ring-2 ring-primary/20 dark:bg-slate-800/80"
        )}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className={cn("h-4 w-4 transition", count > 0 && "text-primary")} />
        {count > 0 ? (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm"
          >
            {count > 9 ? "9+" : count}
          </motion.span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full z-50 mt-2 w-96 overflow-hidden rounded-lg border border-border bg-card shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">Notifications</p>
                  {unreadInList > 0 ? (
                    <p className="text-xs text-muted-foreground">{unreadInList} unread</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {unreadInList > 0 ? (
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary transition hover:bg-primary/10"
                    >
                      <CheckCheck className="h-3 w-3" />
                      Mark all
                    </button>
                  ) : null}
                  <Link
                    href="/notifications"
                    onClick={() => setOpen(false)}
                    className="text-xs text-muted-foreground transition hover:text-primary"
                  >
                    View all
                  </Link>
                </div>
              </div>

              <ul className="max-h-80 overflow-y-auto">
                {isLoading ? (
                  <li className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</li>
                ) : notifications.length === 0 ? (
                  <li className="px-4 py-10 text-center">
                    <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">You&apos;re all caught up</p>
                  </li>
                ) : (
                  notifications.slice(0, 12).map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => handleClick(n)}
                        className={cn(
                          "group w-full border-b border-border/30 px-4 py-3 text-left text-sm transition hover:bg-primary/5",
                          !n.isRead && "bg-primary/[0.03]",
                          n.link ? "cursor-pointer" : "cursor-default"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          {!n.isRead ? (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                          ) : (
                            <span className="mt-1.5 h-2 w-2 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium leading-snug">{n.title}</p>
                              {n.link ? (
                                <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                              ) : null}
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                            <p className="mt-1 text-[10px] text-muted-foreground/80">{timeAgo(n.createdAt)}</p>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </motion.div>
            <button
              type="button"
              className="fixed inset-0 z-40"
              aria-label="Close notifications"
              onClick={() => setOpen(false)}
            />
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
