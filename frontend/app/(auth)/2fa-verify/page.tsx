"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { prefetchAfterAuth } from "@/lib/prefetch-after-auth";
import { useAuthStore } from "@/store/auth-store";
import { getRateLimitMessage } from "@/lib/api-error";

export default function TwoFactorVerifyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setPending2FA = useAuthStore((s) => s.setPending2FA);
  const tempToken = useAuthStore((s) => s.tempToken);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!tempToken) {
      setError("Session expired. Please sign in again.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<{
        accessToken: string;
        sessionId?: string;
        user: { id: string; email: string; name?: string; role: string; mustChangePassword?: boolean };
      }>("/auth/2fa/verify", { tempToken, code });

      setPending2FA(false, null);
      setAuth(
        {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
          mustChangePassword: data.user.mustChangePassword,
        },
        data.accessToken,
        data.sessionId,
        14 * 60_000,
      );
      void prefetchAfterAuth(queryClient, data.user.role);
      if (data.user.mustChangePassword) {
        router.replace("/security/change-password");
      } else {
        router.replace("/dashboard");
      }
    } catch (err) {
      const rateLimit = getRateLimitMessage(err);
      const message = rateLimit
        ? rateLimit
        : isAxiosError(err)
          ? (err.response?.data as { message?: string })?.message ?? err.message
          : "Verification failed";
      setError(Array.isArray(message) ? message.join(", ") : String(message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/30 bg-white/80 p-8 shadow-lg shadow-cyan-500/10 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/60">
      <div className="mb-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">
          Two-factor auth
        </p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">
          Verify your identity
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Required every time you sign in. Open Google Authenticator or Authy and enter the current 6-digit code.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
        <div>
          <label htmlFor="code" className="mb-1 block text-sm font-medium">
            Authentication code
          </label>
          <input
            id="code"
            inputMode="numeric"
            pattern="[0-9A-Za-z]{6,8}"
            maxLength={8}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\s/g, ""))}
            className="w-full rounded-lg border border-border bg-white/50 px-3 py-2 text-center text-lg tracking-[0.4em] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 dark:bg-slate-900/50"
            placeholder="000000"
          />
        </div>
        <button
          type="submit"
          disabled={loading || code.length < 6 || !tempToken}
          className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:bg-cyan-500 disabled:opacity-60"
        >
          {loading ? "Verifying..." : "Verify & continue"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-primary hover:underline">
          Back to login
        </Link>
      </p>
    </div>
  );
}
