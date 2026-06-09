"use client";

import { FormEvent, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { patchDetailItem } from "@/lib/optimistic-mutation";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { formatLabel } from "@/lib/format";
import { useAuthStore } from "@/store/auth-store";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { CardSkeleton } from "@/components/ui/skeleton";
import { FormField, TextInput } from "@/components/ui/form-field";
import { ChangePasswordForm } from "@/components/profile/change-password-form";

type ProfileData = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  department?: string | null;
  designation?: string | null;
  mustChangePassword?: boolean;
};

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const accessToken = useAuthStore((s) => s.accessToken);
  const sessionId = useAuthStore((s) => s.sessionId);
  const [name, setName] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["auth-me"],
    queryFn: async () => {
      const res = await api.get<ProfileData>("/auth/me");
      return res.data;
    },
  });

  const profile = data;

  useEffect(() => {
    if (profile?.name) setName(profile.name);
  }, [profile?.name]);

  const displayName = name || profile?.name || "";

  const authMeKey = ["auth-me"] as const;

  const saveMutation = useOptimisticMutation({
    mutationFn: async (nextName: string) => {
      const res = await api.patch<ProfileData>("/auth/me", { name: nextName.trim() });
      return res.data;
    },
    snapshotKeys: [authMeKey],
    invalidateKeys: [authMeKey],
    onMutate: (nextName) => {
      const trimmed = nextName.trim();
      setSaveError(null);
      setSaveSuccess("Profile updated.");
      setName(trimmed);
      patchDetailItem(queryClient, authMeKey, { name: trimmed });
      if (user && accessToken) {
        setAuth({ ...user, name: trimmed }, accessToken, sessionId, 14 * 60_000);
      }
    },
    onSuccess: (updated) => {
      setName(updated.name);
      if (user && accessToken) {
        setAuth(
          {
            ...user,
            name: updated.name,
            mustChangePassword: updated.mustChangePassword,
          },
          accessToken,
          sessionId,
          14 * 60_000,
        );
      }
    },
    onError: (err) => {
      const message = isAxiosError(err)
        ? (err.response?.data as { message?: string | string[] })?.message ?? err.message
        : "Failed to save profile";
      setSaveError(Array.isArray(message) ? message.join(", ") : String(message));
      setSaveSuccess(null);
    },
  });

  function handleNameSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = (name || profile?.name || "").trim();
    if (!trimmed) {
      setSaveError("Name is required");
      return;
    }
    saveMutation.mutate(trimmed);
  }

  function handlePasswordSuccess() {
    if (user && accessToken) {
      setAuth({ ...user, mustChangePassword: false }, accessToken, sessionId, 14 * 60_000);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Profile" description="Manage your account name and password." />

      {isLoading ? (
        <CardSkeleton />
      ) : error ? (
        <GlassCard>
          <p className="text-sm text-red-500">Failed to load profile.</p>
        </GlassCard>
      ) : (
        <>
          <GlassCard>
            <h2 className="mb-4 text-sm font-semibold">Account</h2>
            <form onSubmit={handleNameSubmit} className="space-y-4">
              {saveError ? (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{saveError}</p>
              ) : null}
              {saveSuccess ? (
                <p className="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-700">{saveSuccess}</p>
              ) : null}
              <FormField label="Name">
                <TextInput
                  value={displayName}
                  onChange={setName}
                  required
                  placeholder="Your full name"
                />
              </FormField>
              <FormField label="Email">
                <TextInput value={profile?.email ?? ""} onChange={() => undefined} disabled />
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Role">
                  <TextInput
                    value={formatLabel(profile?.role ?? "")}
                    onChange={() => undefined}
                    disabled
                  />
                </FormField>
                <FormField label="Phone">
                  <TextInput value={profile?.phone ?? "—"} onChange={() => undefined} disabled />
                </FormField>
                <FormField label="Department">
                  <TextInput value={profile?.department ?? "—"} onChange={() => undefined} disabled />
                </FormField>
                <FormField label="Designation">
                  <TextInput value={profile?.designation ?? "—"} onChange={() => undefined} disabled />
                </FormField>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {saveMutation.isPending ? "Saving…" : "Save name"}
                </button>
              </div>
            </form>
          </GlassCard>

          <GlassCard>
            <h2 className="mb-4 text-sm font-semibold">Change password</h2>
            <ChangePasswordForm onSuccess={handlePasswordSuccess} />
          </GlassCard>
        </>
      )}
    </div>
  );
}
