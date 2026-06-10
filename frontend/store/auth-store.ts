import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isJwtExpired } from "@/lib/jwt";

const SESSION_TOKEN_KEY = "techpotli-access-token";
const AUTH_GRACE_MS = 2 * 60_000;

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
  authenticatedAt: number | null;
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
  hasValidSession: () => boolean;
  isInAuthGracePeriod: () => boolean;
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
  if (!token) return null;
  if (isJwtExpired(token)) {
    clearSessionToken();
    return null;
  }
  return token;
}

function pickLiveToken(currentToken: string | null, storedToken: string | null): string | null {
  if (currentToken && !isJwtExpired(currentToken)) return currentToken;
  if (storedToken && !isJwtExpired(storedToken)) return storedToken;
  return null;
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
      authenticatedAt: null,
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
          authenticatedAt: Date.now(),
        });
      },
      setPending2FA: (pending2FA, tempToken = null) =>
        set({ pending2FA, tempToken, accessToken: null, authenticatedAt: null }),
      setPending2FASetup: (pending2FASetup, setupToken = null) =>
        set({ pending2FASetup, setupToken, accessToken: null, authenticatedAt: null }),
      setAccessToken: (accessToken, sessionId = null) => {
        writeSessionToken(accessToken);
        set({
          accessToken,
          sessionId: sessionId ?? get().sessionId,
          authenticatedAt: get().authenticatedAt ?? Date.now(),
        });
      },
      restoreSessionToken: () => {
        const token = pickLiveToken(get().accessToken, readSessionToken());
        if (token && token !== get().accessToken) {
          set({ accessToken: token });
        }
        return token;
      },
      hasValidSession: () => {
        const token = pickLiveToken(get().accessToken, readSessionToken());
        return !!token;
      },
      isInAuthGracePeriod: () => {
        const at = get().authenticatedAt;
        return !!at && Date.now() - at < AUTH_GRACE_MS;
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
          authenticatedAt: null,
        });
      },
    }),
    {
      name: "techpotli-auth",
      version: 2,
      partialize: (state) => ({
        user: state.user,
        sessionId: state.sessionId,
        pending2FA: state.pending2FA,
        pending2FASetup: state.pending2FASetup,
        tempToken: state.tempToken,
        setupToken: state.setupToken,
      }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<AuthState>;
        const storedToken = readSessionToken();
        const liveToken = pickLiveToken(currentState.accessToken, storedToken);
        const hasLiveSession = !!liveToken;

        if (hasLiveSession) {
          return {
            ...currentState,
            ...persisted,
            accessToken: liveToken,
            user: currentState.user ?? persisted.user ?? null,
            sessionId: currentState.sessionId ?? persisted.sessionId ?? null,
            pending2FA: false,
            pending2FASetup: false,
            tempToken: null,
            setupToken: null,
            authenticatedAt: currentState.authenticatedAt ?? Date.now(),
          };
        }

        return {
          ...currentState,
          ...persisted,
          accessToken: liveToken,
        };
      },
    },
  ),
);
