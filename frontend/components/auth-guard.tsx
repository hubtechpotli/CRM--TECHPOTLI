"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { refreshAccessToken } from "@/lib/api";
import { isJwtExpired } from "@/lib/jwt";
import { useSessionRefresh } from "@/hooks/use-session-refresh";
import { AppShellSkeleton } from "@/components/ui/skeleton";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const pending2FA = useAuthStore((s) => s.pending2FA);
  const pending2FASetup = useAuthStore((s) => s.pending2FASetup);
  const restoreSessionToken = useAuthStore((s) => s.restoreSessionToken);
  const logout = useAuthStore((s) => s.logout);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useSessionRefresh();

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    let cancelled = false;
    (async () => {
      const store = useAuthStore.getState();
      let token = restoreSessionToken();

      try {
        if (!token || isJwtExpired(token)) {
          token = await refreshAccessToken();
        } else if (isJwtExpired(token, 3 * 60_000)) {
          void refreshAccessToken();
        }
      } catch {
        token = restoreSessionToken();
      }

      if (cancelled) return;

      if (!token && store.user) {
        logout();
      }

      setBootstrapping(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, restoreSessionToken, logout]);

  useEffect(() => {
    if (bootstrapping) return;
    const token = useAuthStore.getState().accessToken;
    if (pending2FA) {
      router.replace("/2fa-verify");
      return;
    }
    if (pending2FASetup) {
      router.replace("/security/setup-2fa");
      return;
    }
    if (!token) {
      router.replace("/login");
      return;
    }
    if (user?.mustChangePassword && !pathname.startsWith("/security/change-password")) {
      router.replace("/security/change-password");
    }
  }, [bootstrapping, accessToken, pending2FA, pending2FASetup, user, pathname, router]);

  if (!hydrated || bootstrapping) {
    return <AppShellSkeleton />;
  }

  const token = useAuthStore.getState().accessToken;
  if (!token || pending2FA || pending2FASetup) {
    return <AppShellSkeleton />;
  }

  return <>{children}</>;
}
