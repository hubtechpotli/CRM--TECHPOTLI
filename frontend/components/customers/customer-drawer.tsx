"use client";

import { useQuery } from "@tanstack/react-query";
import { Star, X } from "lucide-react";
import { api } from "@/lib/api";
import { GlassCard } from "@/components/ui/glass-card";

type CustomerDetail = Record<string, unknown>;

export function CustomerDrawer({
  customerId,
  onClose,
}: {
  customerId: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: async () => {
      const res = await api.get<CustomerDetail>(`/customers/${customerId}`);
      return res.data;
    },
  });

  async function toggleFavorite() {
    await api.post(`/customers/${customerId}/favorite`);
  }

  async function createPortalLink() {
    const res = await api.post<{ token: string }>(`/customers/${customerId}/portal`);
    const url = `${window.location.origin}/portal/${res.data.token}`;
    await navigator.clipboard.writeText(url);
    alert("Portal link copied to clipboard");
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/30" aria-label="Close" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Customer details</h2>
          <div className="flex items-center gap-2">
            <button type="button" onClick={toggleFavorite} className="rounded p-1 hover:bg-muted" aria-label="Favorite">
              <Star className="h-4 w-4" />
            </button>
            <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : data ? (
            <div className="space-y-4">
              <GlassCard className="p-4">
                <p className="text-lg font-semibold">{String(data.companyName ?? "—")}</p>
                <p className="text-sm text-muted-foreground">{String(data.ownerName ?? "")}</p>
                <div className="mt-3 space-y-1 text-sm">
                  <p>{String(data.phone ?? "—")}</p>
                  <p>{String(data.email ?? "—")}</p>
                  <p>{String(data.state ?? "—")}</p>
                  <span className="inline-block rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
                    {String(data.status ?? "—")}
                  </span>
                </div>
              </GlassCard>
              <button
                type="button"
                onClick={createPortalLink}
                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Copy client portal link
              </button>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
