"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { isSuperAdmin } from "@/lib/roles";

export function SuperAdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const allowed = isSuperAdmin(role);

  useEffect(() => {
    if (!allowed) router.replace("/dashboard");
  }, [allowed, router]);

  if (!allowed) return null;
  return <>{children}</>;
}
