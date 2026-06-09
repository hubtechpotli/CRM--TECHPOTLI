import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/auth-store";

function apiOriginFromEnv(envUrl: string): string | null {
  const trimmed = envUrl.replace(/\/$/, "");
  if (trimmed === "/api" || trimmed.endsWith("/api")) {
    if (/^https?:\/\//.test(trimmed)) {
      try {
        return new URL(trimmed.replace(/\/api\/?$/, "") || trimmed).origin;
      } catch {
        return null;
      }
    }
    return null;
  }
  if (/^https?:\/\//.test(trimmed)) {
    try {
      return new URL(trimmed).origin;
    } catch {
      return null;
    }
  }
  return null;
}

function resolveApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (typeof window !== "undefined") {
    if (!envUrl || envUrl === "/api") return "/api";
    const envOrigin = apiOriginFromEnv(envUrl);
    if (envOrigin && envOrigin !== window.location.origin) {
      return "/api";
    }
    const trimmed = envUrl.replace(/\/$/, "");
    if (trimmed === "/api" || trimmed.endsWith("/api")) return trimmed;
    if (/^https?:\/\//.test(trimmed)) return `${trimmed}/api`;
    return "/api";
  }

  if (!envUrl) return "http://localhost:3001/api";
  const trimmed = envUrl.replace(/\/$/, "");
  if (trimmed === "/api" || trimmed.endsWith("/api")) return trimmed;
  if (/^https?:\/\//.test(trimmed)) return `${trimmed}/api`;
  return trimmed;
}

const baseURL = resolveApiBaseUrl();

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = api
      .post<{
        accessToken?: string;
        sessionId?: string;
        user?: { id: string; email: string; name?: string; role: string; mustChangePassword?: boolean };
      }>("/auth/refresh")
      .then((res) => {
        const { accessToken, sessionId, user } = res.data;
        if (accessToken) {
          const store = useAuthStore.getState();
          const expiresInMs = 14 * 60_000;
          store.setAccessToken(accessToken, sessionId ?? null, expiresInMs);
          if (user) {
            store.setAuth(
              {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                mustChangePassword: user.mustChangePassword,
              },
              accessToken,
              sessionId ?? null,
              expiresInMs,
            );
          }
          return accessToken;
        }
        return null;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes("/auth/login") &&
      !original.url?.includes("/auth/refresh") &&
      !original.url?.includes("/auth/2fa/")
    ) {
      original._retry = true;
      const token = await refreshAccessToken();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
      useAuthStore.getState().logout();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export { refreshAccessToken };
