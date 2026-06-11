const CHANNEL_NAME = "techpotli-session";
const STORAGE_KEY = "techpotli-session-event";
const REFRESH_LOCK_KEY = "techpotli-refresh-lock";
const REFRESH_RESULT_KEY = "techpotli-refresh-result";
const TAB_ID =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `tab-${Date.now()}-${Math.random()}`;

const LOCK_TTL_MS = 10_000;
const POLL_INTERVAL_MS = 100;
const POLL_MAX_MS = 12_000;

export type SessionEventType = "logout" | "tokens-refreshed";

export type SessionEvent = {
  type: SessionEventType;
  accessToken?: string;
  sourceTabId?: string;
};

type RefreshLock = {
  tabId: string;
  at: number;
};

type RefreshResult = {
  accessToken: string | null;
  at: number;
};

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel(CHANNEL_NAME);
}

export function broadcastSessionEvent(event: SessionEvent) {
  if (typeof window === "undefined") return;
  const payload: SessionEvent = { ...event, sourceTabId: TAB_ID };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...payload, at: Date.now() }));
  } catch {
    /* quota */
  }
  getChannel()?.postMessage(payload);
}

export function subscribeSessionEvents(handler: (event: SessionEvent) => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  const channel = getChannel();
  const onMessage = (e: MessageEvent<SessionEvent>) => {
    if (e.data?.sourceTabId === TAB_ID) return;
    handler(e.data);
  };
  channel?.addEventListener("message", onMessage);

  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try {
      const parsed = JSON.parse(e.newValue) as SessionEvent & { at?: number };
      if (parsed.sourceTabId === TAB_ID) return;
      handler(parsed);
    } catch {
      /* ignore */
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    channel?.removeEventListener("message", onMessage);
    window.removeEventListener("storage", onStorage);
    channel?.close();
  };
}

function readRefreshLock(): RefreshLock | null {
  try {
    const raw = localStorage.getItem(REFRESH_LOCK_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RefreshLock;
  } catch {
    return null;
  }
}

function writeRefreshLock() {
  const lock: RefreshLock = { tabId: TAB_ID, at: Date.now() };
  localStorage.setItem(REFRESH_LOCK_KEY, JSON.stringify(lock));
}

function clearRefreshLock() {
  localStorage.removeItem(REFRESH_LOCK_KEY);
}

function writeRefreshResult(accessToken: string | null) {
  const result: RefreshResult = { accessToken, at: Date.now() };
  localStorage.setItem(REFRESH_RESULT_KEY, JSON.stringify(result));
}

function readRefreshResult(since: number): string | null | undefined {
  try {
    const raw = localStorage.getItem(REFRESH_RESULT_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as RefreshResult;
    if (parsed.at < since) return undefined;
    return parsed.accessToken;
  } catch {
    return undefined;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ensures only one browser tab calls the refresh endpoint at a time.
 * Other tabs wait for the result written to localStorage.
 */
export async function withCrossTabRefreshLock(
  fn: () => Promise<string | null>,
): Promise<string | null> {
  if (typeof window === "undefined") return fn();

  const startedAt = Date.now();
  while (Date.now() - startedAt < POLL_MAX_MS) {
    const lock = readRefreshLock();
    const lockFresh = lock && Date.now() - lock.at < LOCK_TTL_MS;

    if (lockFresh && lock.tabId !== TAB_ID) {
      const waited = Date.now() - startedAt;
      if (waited >= POLL_MAX_MS) break;
      const result = readRefreshResult(lock.at);
      if (result !== undefined) {
        return result;
      }
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    if (!lockFresh) {
      writeRefreshLock();
      try {
        const value = await fn();
        writeRefreshResult(value);
        if (value) {
          broadcastSessionEvent({ type: "tokens-refreshed", accessToken: value });
        }
        return value;
      } finally {
        clearRefreshLock();
      }
    }

    await sleep(POLL_INTERVAL_MS);
  }

  return fn();
}

/** Revoke server session, clear client state, notify other tabs, redirect to login. */
export async function logoutAllSessionsAndRedirect(reason?: string) {
  if (typeof window === "undefined") return;
  broadcastSessionEvent({ type: "logout" });
  const { api } = await import("@/lib/api");
  const { useAuthStore } = await import("@/store/auth-store");
  try {
    await api.post("/auth/logout", {});
  } catch {
    /* session may already be revoked (e.g. after password change) */
  }
  useAuthStore.getState().logout();
  const q = reason ? `?reason=${encodeURIComponent(reason)}` : "";
  window.location.href = `/login${q}`;
}
