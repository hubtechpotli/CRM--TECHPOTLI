"use client";

import { TechPotliLogo } from "@/components/brand/techpotli-logo";
import { ChangePasswordForm } from "@/components/profile/change-password-form";

export default function ChangePasswordPage() {
  return (
    <div className="rounded-2xl border border-white/30 bg-white/80 p-8 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-slate-900/60">
      <div className="mb-6 text-center">
        <TechPotliLogo size="sm" className="mx-auto" />
        <h1 className="mt-4 text-xl font-bold">Change your password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You must set a new password before accessing the CRM. You will be signed out on all devices after updating.
        </p>
      </div>
      <ChangePasswordForm />
    </div>
  );
}
