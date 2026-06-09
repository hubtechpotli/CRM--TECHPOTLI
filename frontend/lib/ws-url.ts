function resolveWsOriginFromEnv(): string | null {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL?.replace(/\/$/, "");
  if (wsUrl) return wsUrl;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (!apiUrl) return null;
  if (apiUrl === "/api") return null;
  return apiUrl.replace(/\/api\/?$/, "") || null;
}

/** WebSocket origin — same host as API, without /api suffix. */
export function getWsUrl(): string {
  if (typeof window !== "undefined") {
    const envOrigin = resolveWsOriginFromEnv();
    if (envOrigin) {
      try {
        const parsed = new URL(envOrigin);
        const isLocalHost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
        if (isLocalHost) return envOrigin;
        if (parsed.origin !== window.location.origin) return window.location.origin;
        return envOrigin;
      } catch {
        return window.location.origin;
      }
    }
    return window.location.origin;
  }

  const envOrigin = resolveWsOriginFromEnv();
  if (envOrigin) return envOrigin;
  return "http://localhost:3001";
}
