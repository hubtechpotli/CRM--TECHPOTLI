"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { TechPotliLogo } from "@/components/brand/techpotli-logo";

export default function Setup2faPage() {
  const router = useRouter();
  const setupToken = useAuthStore((s) => s.setupToken);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setPending2FASetup = useAuthStore((s) => s.setPending2FASetup);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [setupComplete, setSetupComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!setupToken) return;
    api
      .post<{ qrCode: string }>("/auth/2fa/setup-enroll", { setupToken })
      .then((res) => setQrCode(res.data.qrCode))
      .catch((err) => {
        const message = isAxiosError(err)
          ? (err.response?.data as { message?: string })?.message ?? err.message
          : "Setup session expired. Please sign in again.";
        setError(Array.isArray(message) ? message.join(", ") : String(message));
      });
  }, [setupToken]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!setupToken) {
      setError("Session expired. Please sign in again.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<{
        accessToken?: string;
        sessionId?: string;
        backupCodes?: string[];
        user?: { id: string; email: string; role: string; mustChangePassword?: boolean };
      }>("/auth/2fa/confirm-enroll", { setupToken, code });

      if (data.backupCodes?.length) {
        setBackupCodes(data.backupCodes);
      }

      if (data.accessToken && data.user) {
        setPending2FASetup(false, null);
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
        setSetupComplete(true);
      }
    } catch (err) {
      const message = isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message ?? err.message
        : "Verification failed";
      setError(Array.isArray(message) ? message.join(", ") : String(message));
    } finally {
      setLoading(false);
    }
  }

  if (setupComplete && backupCodes) {
    return (
      <div className="rounded-2xl border border-white/30 bg-white/80 p-8 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-slate-900/60">
        <h1 className="text-xl font-bold">Save your backup codes</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Store these codes safely. Each can be used once if you lose your authenticator.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-4 font-mono text-sm">
          {backupCodes.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            const u = useAuthStore.getState().user;
            if (u?.mustChangePassword) router.push("/security/change-password");
            else router.push("/dashboard");
          }}
          className="mt-6 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/30 bg-white/80 p-8 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-slate-900/60">
      <div className="mb-6 text-center">
        <TechPotliLogo size="sm" className="mx-auto" />
        <h1 className="mt-4 text-xl font-bold">Set up two-factor authentication</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scan the QR code with Google Authenticator or Authy, then enter the 6-digit code.
        </p>
      </div>
      {qrCode ? (
        <div className="mb-4 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCode} alt="2FA QR code" className="h-48 w-48 rounded-lg border border-border" />
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>
        ) : null}
        <input
          inputMode="numeric"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="000000"
          className="w-full rounded-lg border border-border px-3 py-2 text-center text-lg tracking-[0.4em]"
        />
        <button
          type="submit"
          disabled={loading || code.length < 6 || !setupToken}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {loading ? "Verifying…" : "Enable 2FA"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm">
        <Link href="/login" className="text-primary hover:underline">
          Back to login
        </Link>
      </p>
    </div>
  );
}
