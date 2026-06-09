"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Calendar,
  ChevronDown,
  LogOut,
  Plus,
  Settings,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { canAccessNav, isSuperAdmin } from "@/lib/roles";
import { useAuthStore } from "@/store/auth-store";
import { ThemeToggle } from "@/components/theme-toggle";
import { GlobalSearch } from "@/components/global-search";
import { NotificationBell } from "@/components/notification-bell";
import { TeamUpdateToast } from "@/components/team-update-toast";
import { api } from "@/lib/api";
import type { TeamUpdatesSummary } from "@/lib/team-updates";
import { TechPotliLogo } from "@/components/brand/techpotli-logo";
import { UserAvatar } from "@/components/ui/user-avatar";
import { NAV_GROUPS, PAGE_CTAS, roleLabel } from "@/lib/shell-nav-groups";

function getPageCta(pathname: string) {
  if (PAGE_CTAS[pathname]) return PAGE_CTAS[pathname];
  const match = Object.keys(PAGE_CTAS).find(
    (k) => k !== "/dashboard" && pathname.startsWith(k),
  );
  return match ? PAGE_CTAS[match] : PAGE_CTAS["/dashboard"];
}

const PREFETCH_ROUTES = ["/dashboard", "/customers", "/leads", "/projects", "/reports"];

function RouteProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(30);
    const t1 = setTimeout(() => setProgress(70), 100);
    const t2 = setTimeout(() => setProgress(100), 250);
    const t3 = setTimeout(() => setProgress(0), 450);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [pathname]);

  if (progress === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 bg-primary/15">
      <div
        className="h-full bg-primary transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isDashboard = pathname === "/dashboard";
  const cta = getPageCta(pathname);

  function prefetchRoute(href: string) {
    if (!PREFETCH_ROUTES.includes(href)) return;
    router.prefetch(href);
    if (href === "/dashboard") {
      queryClient.prefetchQuery({
        queryKey: ["crm-insights"],
        queryFn: async () => (await api.get("/reports/crm-insights")).data,
        staleTime: 60_000,
      });
    }
    if (href === "/customers") {
      queryClient.prefetchQuery({
        queryKey: ["customers-directory", { page: 1, limit: 50 }],
        queryFn: async () => (await import("@/lib/customers-directory")).fetchCustomersDirectory({ page: 1, limit: 50 }),
        staleTime: 60_000,
      });
    }
    if (href === "/leads") {
      queryClient.prefetchQuery({
        queryKey: ["leads", "", "", 1],
        queryFn: async () => (await api.get("/leads", { params: { page: 1, limit: 50 } })).data,
        staleTime: 60_000,
      });
    }
  }

  const { data: teamSummary } = useQuery({
    queryKey: ["team-updates-summary"],
    queryFn: async () => {
      const res = await api.get<TeamUpdatesSummary>("/team-updates/summary");
      return res.data;
    },
    enabled: !!accessToken,
    refetchInterval: 60_000,
  });
  const teamBadgeCount = teamSummary?.openTotal ?? 0;

  function handleLogout() {
    const sessionId = useAuthStore.getState().sessionId;
    api.post("/auth/logout", { sessionId: sessionId ?? undefined }).catch(() => undefined);
    logout();
    router.push("/login");
  }

  const superAdmin = isSuperAdmin(user?.role);

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccessNav(user?.role, item.href)),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex min-h-screen bg-background">
      <RouteProgress />
      <aside
        className="flex shrink-0 flex-col bg-sidebar text-sidebar-foreground"
        style={{ width: "var(--sidebar-width)" }}
      >
        <div className="border-b border-white/10 px-5 py-5">
          <TechPotliLogo size="sm" className="items-start" />
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-indigo-200/50">
            CRM Console
          </p>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto p-3">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-indigo-200/40">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active =
                    pathname === href ||
                    (href !== "/dashboard" && pathname.startsWith(href));
                  const teamUpdatesHighlight =
                    href === "/team-updates" && teamBadgeCount > 0 && !active;
                  return (
                    <Link
                      key={href}
                      href={href}
                      onMouseEnter={() => prefetchRoute(href)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                        active
                          ? "bg-primary text-primary-foreground shadow-md shadow-indigo-900/40"
                          : teamUpdatesHighlight
                            ? "bg-primary/25 text-white ring-1 ring-primary/50 shadow-sm shadow-primary/20 hover:bg-primary/35"
                            : "text-indigo-100/80 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{label}</span>
                      {href === "/team-updates" && teamBadgeCount > 0 ? (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                          {teamBadgeCount > 99 ? "99+" : teamBadgeCount}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-white/10"
              >
                <UserAvatar name={user?.name ?? "User"} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{user?.name ?? "User"}</p>
                  <p className="truncate text-[10px] text-indigo-200/60">{roleLabel(user?.role)}</p>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-indigo-200/60" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="start"
                side="top"
                className="z-50 mb-2 w-48 rounded-xl border border-border bg-card p-1 shadow-lg"
              >
                <DropdownMenu.Item
                  onSelect={() => router.push("/profile")}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs outline-none focus:bg-muted"
                >
                  <User className="h-3.5 w-3.5" /> Profile
                </DropdownMenu.Item>
                {superAdmin ? (
                  <DropdownMenu.Item
                    onSelect={() => router.push("/settings")}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs outline-none focus:bg-muted"
                  >
                    <Settings className="h-3.5 w-3.5" /> Settings
                  </DropdownMenu.Item>
                ) : null}
                <DropdownMenu.Item
                  onSelect={handleLogout}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-600 outline-none focus:bg-red-50 dark:focus:bg-red-950/30"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border/60 bg-card/80 px-6 py-4 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              {isDashboard ? (
                <>
                  <h1 className="text-xl font-bold tracking-tight">
                    Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}! 👋
                  </h1>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Here&apos;s what&apos;s happening with your leads today.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-lg font-bold tracking-tight capitalize">
                    {visibleGroups.flatMap((g) => g.items).find(
                      (i) => pathname === i.href || pathname.startsWith(i.href + "/"),
                    )?.label ?? "TechPotli"}
                  </h1>
                  {user?.email ? (
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  ) : null}
                </>
              )}
            </div>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3">
              <div className="hidden flex-1 justify-center md:flex md:max-w-md">
                <GlobalSearch />
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={cta.href}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-indigo-600"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {cta.label}
                </Link>
                <Link
                  href="/leads"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  title="Follow-ups"
                >
                  <Calendar className="h-4 w-4" />
                </Link>
                <NotificationBell />
                {superAdmin ? (
                  <Link
                    href="/settings"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <Settings className="h-4 w-4" />
                  </Link>
                ) : null}
                <ThemeToggle />
              </div>
            </div>
          </div>
          <div className="mt-3 md:hidden">
            <GlobalSearch />
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
      <TeamUpdateToast />
    </div>
  );
}
