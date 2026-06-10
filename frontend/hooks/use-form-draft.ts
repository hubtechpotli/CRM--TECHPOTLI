"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/auth-store";

function draftStorageKey(userId: string, key: string) {
  return `techpotli:draft:${userId}:${key}`;
}

export function useFormDraft<T extends Record<string, unknown>>({
  draftKey,
  initial,
  enabled = true,
}: {
  draftKey: string;
  initial: T;
  enabled?: boolean;
}) {
  const userId = useAuthStore((s) => s.user?.id) ?? "anonymous";
  const storageKey = draftStorageKey(userId, draftKey);
  const [form, setForm] = useState<T>(initial);
  const [restored, setRestored] = useState(false);
  const [dirty, setDirty] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as T;
        setForm(parsed);
        setRestored(true);
        setDirty(true);
      }
    } catch {
      /* ignore corrupt draft */
    }
  }, [storageKey, enabled]);

  const persist = useCallback(
    (next: T) => {
      if (!enabled || typeof window === "undefined") return;
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* quota exceeded */
      }
    },
    [storageKey, enabled],
  );

  const setFormDraft = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setForm((prev) => {
        const next = typeof updater === "function" ? (updater as (p: T) => T)(prev) : updater;
        setDirty(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => persist(next), 400);
        return next;
      });
    },
    [persist],
  );

  const clearDraft = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(storageKey);
    }
    setRestored(false);
    setDirty(false);
    setForm(initial);
  }, [storageKey, initial]);

  const discardDraft = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(storageKey);
    }
    setRestored(false);
    setDirty(false);
    setForm(initial);
  }, [storageKey, initial]);

  const hasDraft = useCallback(() => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem(storageKey);
  }, [storageKey]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    form,
    setForm: setFormDraft,
    restored,
    dirty,
    clearDraft,
    discardDraft,
    hasDraft,
  };
}

export function peekFormDraft(userId: string | undefined, draftKey: string): boolean {
  if (!userId || typeof window === "undefined") return false;
  return !!localStorage.getItem(draftStorageKey(userId, draftKey));
}
