"use client";

import { FormEvent, useState } from "react";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { logoutAllSessionsAndRedirect } from "@/lib/session-sync";
import { FormField } from "@/components/ui/form-field";
import { PasswordInput } from "@/components/ui/password-input";

const PASSWORD_HINT = "Min 8 chars with uppercase, number, and special character";

type ChangePasswordFormProps = {
  submitLabel?: string;
  showCancel?: boolean;
  onCancel?: () => void;
};

export function ChangePasswordForm({
  submitLabel = "Update password",
  showCancel,
  onCancel,
}: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      await logoutAllSessionsAndRedirect("password-changed");
    } catch (err) {
      const message = isAxiosError(err)
        ? (err.response?.data as { message?: string | string[] })?.message ?? err.message
        : "Failed to change password";
      setError(Array.isArray(message) ? message.join(", ") : String(message));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <FormField label="Current password">
        <PasswordInput
          value={currentPassword}
          onChange={setCurrentPassword}
          required
          autoComplete="current-password"
        />
      </FormField>
      <FormField label="New password">
        <PasswordInput
          value={newPassword}
          onChange={setNewPassword}
          required
          autoComplete="new-password"
        />
        <p className="mt-1 text-xs text-muted-foreground">{PASSWORD_HINT}</p>
      </FormField>
      <FormField label="Confirm new password">
        <PasswordInput
          value={confirmPassword}
          onChange={setConfirmPassword}
          required
          autoComplete="new-password"
        />
      </FormField>
      <div className="flex justify-end gap-2 pt-1">
        {showCancel && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {loading ? "Updating…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
