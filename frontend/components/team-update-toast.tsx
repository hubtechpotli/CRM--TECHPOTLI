"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, MessageSquare, X } from "lucide-react";
import { invalidateTeamUpdates } from "@/lib/team-updates";
import { useSocket } from "@/lib/socket-provider";

type WorkItemToast = {
  id: string;
  title: string;
  customerId: string;
  customerName: string;
  createdBy?: { name?: string };
};

export function TeamUpdateToast() {
  const socket = useSocket();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [toasts, setToasts] = useState<WorkItemToast[]>([]);

  useEffect(() => {
    if (!socket) return;

    const onWorkItem = (payload: WorkItemToast) => {
      invalidateTeamUpdates(queryClient);
      queryClient.invalidateQueries({ queryKey: ["notifications-count"] });
      const toastId = `${payload.id}-${Date.now()}`;
      setToasts((prev) => [{ ...payload, id: toastId }, ...prev].slice(0, 4));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toastId));
      }, 8000);
    };

    socket.on("work_item:new", onWorkItem);

    return () => {
      socket.off("work_item:new", onWorkItem);
    };
  }, [socket, queryClient]);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  function goToCustomer(customerId: string) {
    router.push(`/customers/${customerId}?tab=teamWork`);
  }

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[100] flex w-full max-w-sm flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 80, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto relative overflow-hidden rounded-xl border border-primary/30 bg-card shadow-2xl shadow-primary/10"
          >
            <button
              type="button"
              onClick={() => goToCustomer(toast.customerId)}
              className="w-full p-4 pr-12 text-left transition hover:bg-primary/5"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">New team update</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    {toast.customerName}
                  </p>
                  <p className="mt-1 font-semibold leading-snug">{toast.title}</p>
                  {toast.createdBy?.name ? (
                    <p className="mt-1 text-xs text-muted-foreground">by {toast.createdBy.name}</p>
                  ) : null}
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-muted"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
