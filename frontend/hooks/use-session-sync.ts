"use client";

import { useEffect } from "react";
import { subscribeSessionEvents } from "@/lib/session-sync";
import { useAuthStore } from "@/store/auth-store";

/**
 * Syncs logout and token refresh across browser tabs.
 */
export function useSessionSync() {
  useEffect(() => {
    return subscribeSessionEvents((event) => {
      if (event.type === "logout") {
        useAuthStore.getState().logout();
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
        return;
      }
      if (event.type === "tokens-refreshed" && event.accessToken) {
        useAuthStore.getState().setAccessToken(event.accessToken);
      }
    });
  }, []);
}
