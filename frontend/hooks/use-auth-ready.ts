"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";

export function useAuthReady() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const restoreSessionToken = useAuthStore((s) => s.restoreSessionToken);
  const hasValidSession = useAuthStore((s) => s.hasValidSession);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  const token = hydrated ? restoreSessionToken() : null;
  const authReady = hydrated && hasValidSession();

  return { authReady, accessToken: token, hydrated };
}
