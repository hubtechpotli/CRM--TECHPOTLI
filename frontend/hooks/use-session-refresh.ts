"use client";

import { useEffect } from "react";
import { refreshAccessToken } from "@/lib/api";
import { isJwtExpired } from "@/lib/jwt";
import { useAuthStore } from "@/store/auth-store";

const REFRESH_INTERVAL_MS = 5 * 60_000;
const REFRESH_SKEW_MS = 5 * 60_000;

/**
 * Keeps the access token fresh while the tab is open (silent refresh via httpOnly cookie).
 */
export function useSessionRefresh() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) return;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      const store = useAuthStore.getState();
      if (store.isInAuthGracePeriod()) return;
      const token = store.restoreSessionToken();
      if (!token || isJwtExpired(token, REFRESH_SKEW_MS)) {
        void refreshAccessToken();
      }
    };

    tick();
    const id = window.setInterval(tick, REFRESH_INTERVAL_MS);
    const onVisible = () => tick();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [accessToken, user]);
}
