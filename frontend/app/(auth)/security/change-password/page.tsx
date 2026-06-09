"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { TechPotliLogo } from "@/components/brand/techpotli-logo";
import { ChangePasswordForm } from "@/components/profile/change-password-form";

export default function ChangePasswordPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const accessToken = useAuthStore((s) => s.accessToken);
  const sessionId = useAuthStore((s) => s.sessionId);

  return (
    <div className="rounded-2xl border border-white/30 bg-white/80 p-8 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-slate-900/60">
      <div className="mb-6 text-center">
        <TechPotliLogo size="sm" className="mx-auto" />
        <h1 className="mt-4 text-xl font-bold">Change your password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You must set a new password before accessing the CRM.
        </p>
      </div>
      <ChangePasswordForm
        onSuccess={() => {
          if (user && accessToken) {
            setAuth({ ...user, mustChangePassword: false }, accessToken, sessionId, 14 * 60_000);
          }
          router.push("/dashboard");
        }}
      />
    </div>
  );
}
