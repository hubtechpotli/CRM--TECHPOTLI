import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isJwtExpired } from "@/lib/jwt";

const SESSION_TOKEN_KEY = "techpotli-access-token";

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

function writeSessionToken(accessToken: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSION_TOKEN_KEY, accessToken);
  } catch {
    /* quota exceeded */
  }
}

function clearSessionToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_TOKEN_KEY);
}

function readSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(SESSION_TOKEN_KEY);
  if (!token || isJwtExpired(token)) {
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
      setAuth: (user, accessToken, sessionId = null) => {
        writeSessionToken(accessToken);
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
      setAccessToken: (accessToken, sessionId = null) => {
        writeSessionToken(accessToken);
        set({ accessToken, sessionId: sessionId ?? get().sessionId });
      },
      restoreSessionToken: () => {
        const existing = get().accessToken;
        if (existing && !isJwtExpired(existing)) return existing;
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
        sessionId: state.sessionId,
        pending2FA: state.pending2FA,
        pending2FASetup: state.pending2FASetup,
        tempToken: state.tempToken,
        setupToken: state.setupToken,
      }),
    },
  ),
);
