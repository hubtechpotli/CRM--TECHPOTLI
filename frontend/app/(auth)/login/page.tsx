"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { TechPotliLogo } from "@/components/brand/techpotli-logo";

type LoginResponse = {
  requires2FA?: boolean;
  tempToken?: string;
  requires2FASetup?: boolean;
  setupToken?: string;
  accessToken?: string;
  sessionId?: string;
  user?: { id: string; email: string; role: string; mustChangePassword?: boolean };
};

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setPending2FA = useAuthStore((s) => s.setPending2FA);
  const setPending2FASetup = useAuthStore((s) => s.setPending2FASetup);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<LoginResponse>("/auth/login", { email, password });

      if (data.requires2FASetup && data.setupToken) {
        setPending2FASetup(true, data.setupToken);
        router.push("/security/setup-2fa");
        return;
      }

      if (data.requires2FA && data.tempToken) {
        setPending2FA(true, data.tempToken);
        router.push("/2fa-verify");
        return;
      }

      if (data.accessToken && data.user) {
        setAuth(
          {
            id: data.user.id,
            email: data.user.email,
            role: data.user.role,
            mustChangePassword: data.user.mustChangePassword,
          },
          data.accessToken,
          data.sessionId,
        );
        if (data.user.mustChangePassword) {
          router.push("/security/change-password");
        } else {
          router.push("/dashboard");
        }
        return;
      }

      setError("Unexpected response from server.");
    } catch (err) {
      const message = isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message ?? err.message
        : "Sign in failed";
      setError(Array.isArray(message) ? message.join(", ") : String(message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/30 bg-white/80 p-8 shadow-lg shadow-indigo-500/10 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/60">
      <div className="mb-8 text-center">
        <TechPotliLogo size="lg" priority className="mx-auto" />
        <h1 className="mt-4 text-2xl font-bold text-foreground">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Access your workspace dashboard
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border bg-white/50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-slate-900/50"
            placeholder="you@techpotli.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-white/50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-slate-900/50"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-indigo-600 disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Continue"}
        </button>
      </form>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Protected by TechPotli security policies · 2FA required
      </p>
    </div>
  );
}
