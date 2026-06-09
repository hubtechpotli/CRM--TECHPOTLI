"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { isAxiosError } from "axios";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { TechPotliLogo } from "@/components/brand/techpotli-logo";
import { AuthCardShell } from "@/components/auth/auth-card-shell";
import { cn } from "@/lib/utils";

type LoginResponse = {
  requires2FA?: boolean;
  tempToken?: string;
  requires2FASetup?: boolean;
  setupToken?: string;
  accessToken?: string;
  sessionId?: string;
  user?: { id: string; email: string; role: string; mustChangePassword?: boolean };
};

const inputClass =
  "w-full rounded-xl border border-border/80 bg-white/60 py-2.5 pl-10 pr-3 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 dark:bg-slate-900/40 dark:focus:bg-slate-900/70";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setPending2FA = useAuthStore((s) => s.setPending2FA);
  const setPending2FASetup = useAuthStore((s) => s.setPending2FASetup);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(null);

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
          14 * 60_000,
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
    <AuthCardShell>
      <div className="mb-8 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <TechPotliLogo size="lg" priority className="mx-auto" />
        </motion.div>
        <motion.h1
          className="mt-5 text-2xl font-bold tracking-tight text-foreground"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          Welcome back
        </motion.h1>
        <motion.p
          className="mt-1.5 text-sm text-muted-foreground"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          Sign in to access your workspace dashboard
        </motion.p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        {error ? (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </motion.p>
        ) : null}

        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            Email address
          </label>
          <div className="relative">
            <Mail
              className={cn(
                "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors",
                focusedField === "email" ? "text-primary" : "text-muted-foreground",
              )}
            />
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
              className={inputClass}
              placeholder="you@techpotli.com"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
            Password
          </label>
          <div className="relative">
            <Lock
              className={cn(
                "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors",
                focusedField === "password" ? "text-primary" : "text-muted-foreground",
              )}
            />
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
              className={inputClass}
              placeholder="Enter your password"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          <button
            type="submit"
            disabled={loading}
            className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-indigo-600 hover:shadow-indigo-500/40 disabled:opacity-60 disabled:hover:shadow-indigo-500/25"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Continue to dashboard
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </span>
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </button>
        </motion.div>
      </form>

      <motion.div
        className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.45 }}
      >
        <ShieldCheck className="h-3.5 w-3.5 text-primary/70" />
        <span>Protected by TechPotli security · 2FA required</span>
      </motion.div>
    </AuthCardShell>
  );
}
