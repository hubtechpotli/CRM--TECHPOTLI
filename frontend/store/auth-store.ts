import { create } from "zustand";
import { persist } from "zustand/middleware";

const SESSION_TOKEN_KEY = "techpotli-access-token";
const SESSION_EXPIRES_KEY = "techpotli-access-expires";

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  role?: string;
  mustChangePassword?: boolean;
};

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  sessionId: string | null;
  tempToken: string | null;
  setupToken: string | null;
  pending2FA: boolean;
  pending2FASetup: boolean;
  setAuth: (
    user: AuthUser,
    accessToken: string,
    sessionId?: string | null,
    expiresInMs?: number,
  ) => void;
  setPending2FA: (pending: boolean, tempToken?: string | null) => void;
  setPending2FASetup: (pending: boolean, setupToken?: string | null) => void;
  setAccessToken: (accessToken: string, sessionId?: string | null, expiresInMs?: number) => void;
  restoreSessionToken: () => string | null;
  logout: () => void;
};

function writeSessionToken(accessToken: string, expiresInMs = 14 * 60_000) {
  if (typeof window === "undefined") return;
  const expiresAt = Date.now() + expiresInMs;
  sessionStorage.setItem(SESSION_TOKEN_KEY, accessToken);
  sessionStorage.setItem(SESSION_EXPIRES_KEY, String(expiresAt));
}

function clearSessionToken() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
  sessionStorage.removeItem(SESSION_EXPIRES_KEY);
}

function readSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
  const expiresRaw = sessionStorage.getItem(SESSION_EXPIRES_KEY);
  if (!token || !expiresRaw) return null;
  if (Date.now() >= Number(expiresRaw)) {
    clearSessionToken();
    return null;
  }
  return token;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      sessionId: null,
      tempToken: null,
      setupToken: null,
      pending2FA: false,
      pending2FASetup: false,
      setAuth: (user, accessToken, sessionId = null, expiresInMs) => {
        writeSessionToken(accessToken, expiresInMs);
        set({
          user,
          accessToken,
          sessionId,
          pending2FA: false,
          pending2FASetup: false,
          tempToken: null,
          setupToken: null,
        });
      },
      setPending2FA: (pending2FA, tempToken = null) =>
        set({ pending2FA, tempToken }),
      setPending2FASetup: (pending2FASetup, setupToken = null) =>
        set({ pending2FASetup, setupToken }),
      setAccessToken: (accessToken, sessionId = null, expiresInMs) => {
        writeSessionToken(accessToken, expiresInMs);
        set({ accessToken, sessionId });
      },
      restoreSessionToken: () => {
        const existing = get().accessToken;
        if (existing) return existing;
        const token = readSessionToken();
        if (token) set({ accessToken: token });
        return token;
      },
      logout: () => {
        clearSessionToken();
        set({
          user: null,
          accessToken: null,
          sessionId: null,
          tempToken: null,
          setupToken: null,
          pending2FA: false,
          pending2FASetup: false,
        });
      },
    }),
    {
      name: "techpotli-auth",
      partialize: (state) => ({
        user: state.user,
        pending2FA: state.pending2FA,
        pending2FASetup: state.pending2FASetup,
        tempToken: state.tempToken,
        setupToken: state.setupToken,
      }),
    },
  ),
);
