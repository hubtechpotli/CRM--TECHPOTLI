"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { refreshAccessToken } from "@/lib/api";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const pending2FA = useAuthStore((s) => s.pending2FA);
  const pending2FASetup = useAuthStore((s) => s.pending2FASetup);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!accessToken) {
        const token = await refreshAccessToken();
        if (cancelled) return;
        if (!token) {
          setBootstrapping(false);
          return;
        }
      }
      if (!cancelled) setBootstrapping(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

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

  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading session…
      </div>
    );
  }

  const token = useAuthStore.getState().accessToken;
  if (!token || pending2FA || pending2FASetup) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Redirecting…
      </div>
    );
  }

  return <>{children}</>;
}
