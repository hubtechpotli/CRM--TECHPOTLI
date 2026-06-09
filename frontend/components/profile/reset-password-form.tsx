"use client";

import { FormEvent, useState } from "react";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { FormField } from "@/components/ui/form-field";
import { PasswordInput } from "@/components/ui/password-input";

const PASSWORD_HINT = "Min 8 chars with uppercase, number, and special character";

type ResetPasswordFormProps = {
  userId: string;
  onSuccess?: () => void;
};

export function ResetPasswordForm({ userId, onSuccess }: ResetPasswordFormProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post(`/users/${userId}/reset-password`, { newPassword, confirmPassword });
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Password reset. The employee must change it on next login.");
      onSuccess?.();
    } catch (err) {
      const message = isAxiosError(err)
        ? (err.response?.data as { message?: string | string[] })?.message ?? err.message
        : "Failed to reset password";
      setError(Array.isArray(message) ? message.join(", ") : String(message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">{success}</p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Set a temporary password. The employee will be required to change it on next login.
      </p>
      <FormField label="New password">
        <PasswordInput value={newPassword} onChange={setNewPassword} required autoComplete="new-password" />
        <p className="mt-1 text-xs text-muted-foreground">{PASSWORD_HINT}</p>
      </FormField>
      <FormField label="Confirm new password">
        <PasswordInput value={confirmPassword} onChange={setConfirmPassword} required autoComplete="new-password" />
      </FormField>
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-500/20 disabled:opacity-60 dark:text-amber-200"
      >
        {loading ? "Resetting…" : "Reset password"}
      </button>
    </form>
  );
}
