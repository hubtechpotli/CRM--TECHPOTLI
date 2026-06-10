"use client";

import { useEffect } from "react";
import { refreshAccessToken } from "@/lib/api";
import { isJwtExpired } from "@/lib/jwt";
import { useAuthStore } from "@/store/auth-store";

const REFRESH_INTERVAL_MS = 12 * 60_000;

/**
 * Keeps the access token fresh while the tab is open (Instagram/GitHub-style silent refresh).
 */
export function useSessionRefresh() {
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) return;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      const token = useAuthStore.getState().accessToken;
      if (!token || isJwtExpired(token, 3 * 60_000)) {
        void refreshAccessToken();
      }
    };

    const id = window.setInterval(tick, REFRESH_INTERVAL_MS);
    const onVisible = () => tick();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [accessToken]);
}
