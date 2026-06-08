"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { GlassCard } from "@/components/ui/glass-card";
import { formatDateTime } from "@/lib/format";

type Session = {
  id: string;
  device?: string | null;
  browser?: string | null;
  ip?: string | null;
  lastActiveAt: string;
  createdAt: string;
  current?: boolean;
};

export function SecurityPanel() {
  const queryClient = useQueryClient();
  const sessionId = useAuthStore((s) => s.sessionId);
  const logout = useAuthStore((s) => s.logout);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["auth-sessions"],
    queryFn: async () => {
      const res = await api.get<Session[]>("/auth/sessions");
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (targetSessionId?: string) => {
      await api.post("/auth/logout", { sessionId: targetSessionId });
    },
    onSuccess: (_data, targetSessionId) => {
      queryClient.invalidateQueries({ queryKey: ["auth-sessions"] });
      if (!targetSessionId || targetSessionId === sessionId) {
        logout();
        window.location.href = "/login";
      }
    },
  });

  const setup2faMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ qrCode: string; secret: string }>("/auth/2fa/setup");
      return res.data;
    },
  });

  const confirm2faMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await api.post<{ backupCodes: string[] }>("/auth/2fa/confirm", { code });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-sessions"] });
    },
  });

  return (
    <div className="space-y-6">
      <GlassCard>
        <h3 className="mb-2 text-sm font-semibold">Two-factor authentication</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Required for all users. Re-enroll if you changed your phone.
        </p>
        {setup2faMutation.data?.qrCode ? (
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={setup2faMutation.data.qrCode}
              alt="2FA QR"
              className="h-40 w-40 rounded border border-border"
            />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const code = new FormData(e.currentTarget).get("code") as string;
                confirm2faMutation.mutate(code);
              }}
              className="flex gap-2"
            >
              <input
                name="code"
                maxLength={6}
                required
                placeholder="6-digit code"
                className="rounded-lg border border-border px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={confirm2faMutation.isPending}
                className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
              >
                Confirm
              </button>
            </form>
            {confirm2faMutation.data?.backupCodes ? (
              <div className="rounded-lg bg-muted/50 p-3 font-mono text-xs">
                {confirm2faMutation.data.backupCodes.join(" · ")}
              </div>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setup2faMutation.mutate()}
            disabled={setup2faMutation.isPending}
            className="rounded-lg border border-primary/30 px-3 py-2 text-xs font-medium text-primary"
          >
            {setup2faMutation.isPending ? "Loading…" : "Re-enroll authenticator"}
          </button>
        )}
      </GlassCard>

      <GlassCard>
        <h3 className="mb-2 text-sm font-semibold">Active sessions</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Devices currently signed in to your account.
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {s.browser ?? "Browser"} · {s.device ?? "Device"}
                    {s.current ? (
                      <span className="ml-2 rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] text-green-700">
                        This device
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.ip ?? "—"} · Last active {formatDateTime(s.lastActiveAt)}
                  </p>
                </div>
                {!s.current ? (
                  <button
                    type="button"
                    onClick={() => revokeMutation.mutate(s.id)}
                    disabled={revokeMutation.isPending}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Sign out
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {sessions.length > 1 ? (
          <button
            type="button"
            onClick={async () => {
              for (const s of sessions.filter((x) => !x.current)) {
                await api.post("/auth/logout", { sessionId: s.id });
              }
              queryClient.invalidateQueries({ queryKey: ["auth-sessions"] });
            }}
            disabled={revokeMutation.isPending}
            className="mt-4 text-xs font-medium text-red-600 hover:underline"
          >
            Sign out all other devices
          </button>
        ) : null}
      </GlassCard>
    </div>
  );
}
