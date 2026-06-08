import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  ) => void;
  setPending2FA: (pending: boolean, tempToken?: string | null) => void;
  setPending2FASetup: (pending: boolean, setupToken?: string | null) => void;
  setAccessToken: (accessToken: string, sessionId?: string | null) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      sessionId: null,
      tempToken: null,
      setupToken: null,
      pending2FA: false,
      pending2FASetup: false,
      setAuth: (user, accessToken, sessionId = null) =>
        set({
          user,
          accessToken,
          sessionId,
          pending2FA: false,
          pending2FASetup: false,
          tempToken: null,
          setupToken: null,
        }),
      setPending2FA: (pending2FA, tempToken = null) =>
        set({ pending2FA, tempToken }),
      setPending2FASetup: (pending2FASetup, setupToken = null) =>
        set({ pending2FASetup, setupToken }),
      setAccessToken: (accessToken, sessionId = null) =>
        set({ accessToken, sessionId }),
      logout: () =>
        set({
          user: null,
          accessToken: null,
          sessionId: null,
          tempToken: null,
          setupToken: null,
          pending2FA: false,
          pending2FASetup: false,
        }),
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
