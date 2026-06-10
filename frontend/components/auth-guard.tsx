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
  const hasValidSession = useAuthStore((s) => s.hasValidSession);
  const isInAuthGracePeriod = useAuthStore((s) => s.isInAuthGracePeriod);
  const setPending2FA = useAuthStore((s) => s.setPending2FA);
  const setPending2FASetup = useAuthStore((s) => s.setPending2FASetup);
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
      let token = restoreSessionToken();

      try {
        if (!token || isJwtExpired(token)) {
          token = (await refreshAccessToken()) ?? restoreSessionToken();
        } else if (!isInAuthGracePeriod() && isJwtExpired(token, 3 * 60_000)) {
          void refreshAccessToken();
        }
      } catch {
        token = restoreSessionToken();
      }

      if (cancelled) return;

      if (!restoreSessionToken() && useAuthStore.getState().user) {
        logout();
      }

      setBootstrapping(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, restoreSessionToken, isInAuthGracePeriod, logout]);

  useEffect(() => {
    if (bootstrapping) return;

    const token = restoreSessionToken();
    const sessionValid = !!token && !isJwtExpired(token);

    if (sessionValid && pending2FA) {
      setPending2FA(false, null);
    }
    if (sessionValid && pending2FASetup) {
      setPending2FASetup(false, null);
    }

    if (!sessionValid && pending2FA) {
      router.replace("/2fa-verify");
      return;
    }
    if (!sessionValid && pending2FASetup) {
      router.replace("/security/setup-2fa");
      return;
    }
    if (!sessionValid) {
      router.replace("/login");
      return;
    }
    if (user?.mustChangePassword && !pathname.startsWith("/security/change-password")) {
      router.replace("/security/change-password");
    }
  }, [
    bootstrapping,
    accessToken,
    pending2FA,
    pending2FASetup,
    user,
    pathname,
    router,
    restoreSessionToken,
    setPending2FA,
    setPending2FASetup,
  ]);

  if (!hydrated || bootstrapping) {
    return <AppShellSkeleton />;
  }

  if (!hasValidSession() || (pending2FA && !hasValidSession()) || (pending2FASetup && !hasValidSession())) {
    return <AppShellSkeleton />;
  }

  return <>{children}</>;
}
