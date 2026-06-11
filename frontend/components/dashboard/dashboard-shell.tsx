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
import { SectionHero } from "@/components/dashboard/section-hero";
import { api } from "@/lib/api";
import type { TeamUpdatesSummary } from "@/lib/team-updates";
import { TechPotliLogo } from "@/components/brand/techpotli-logo";
import { UserAvatar } from "@/components/ui/user-avatar";
import { NAV_GROUPS, roleLabel } from "@/lib/shell-nav-groups";
import { resolvePageMeta } from "@/lib/page-meta";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import {
  CUSTOMERS_DIRECTORY_STALE_MS,
  LIST_STALE_MS,
  REPORTS_STALE_MS,
  TEAM_FEED_STALE_MS,
} from "@/lib/query-stale";
import {
  getPageIcon,
  getRouteColor,
  shouldShowSectionHero,
} from "@/lib/nav-colors";

const PREFETCH_ROUTES = [
  "/dashboard",
  "/customers",
  "/leads",
  "/projects",
  "/invoices",
  "/payments",
  "/quotations",
  "/employees",
  "/reports",
  "/team-updates",
  "/renewals",
  "/support",
];

function RouteProgress({ color }: { color: string }) {
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
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 bg-black/5">
      <div
        className="h-full transition-all duration-200 ease-out"
        style={{ width: `${progress}%`, backgroundColor: color }}
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
  const pageMeta = resolvePageMeta(pathname);
  const routeColor = getRouteColor(pathname);
  const PageIcon = getPageIcon(pathname);
  const showHero = shouldShowSectionHero(pathname);

  function prefetchRoute(href: string) {
    if (!PREFETCH_ROUTES.includes(href)) return;
    router.prefetch(href);
    if (href === "/dashboard") {
      queryClient.prefetchQuery({
        queryKey: ["crm-insights"],
        queryFn: async () => (await api.get("/reports/crm-insights")).data,
        staleTime: REPORTS_STALE_MS,
      });
    }
    if (href === "/customers") {
      const customerParams = {
        q: undefined,
        status: undefined,
        assignedEmployeeId: undefined,
        page: 1,
        limit: DEFAULT_PAGE_SIZE,
      };
      queryClient.prefetchQuery({
        queryKey: ["customers-directory", customerParams],
        queryFn: async () =>
          (await import("@/lib/customers-directory")).fetchCustomersDirectory(customerParams),
        staleTime: CUSTOMERS_DIRECTORY_STALE_MS,
      });
    }
    if (href === "/leads") {
      queryClient.prefetchQuery({
        queryKey: ["leads", "", "", 1, DEFAULT_PAGE_SIZE],
        queryFn: async () =>
          (await api.get("/leads", { params: { page: 1, limit: DEFAULT_PAGE_SIZE } })).data,
        staleTime: LIST_STALE_MS,
      });
    }
    if (href === "/team-updates") {
      queryClient.prefetchQuery({
        queryKey: ["team-updates-summary"],
        queryFn: async () => (await api.get("/team-updates/summary")).data,
        staleTime: TEAM_FEED_STALE_MS,
      });
    }
    if (href === "/invoices") {
      queryClient.prefetchQuery({
        queryKey: ["invoices", 1, DEFAULT_PAGE_SIZE],
        queryFn: async () =>
          (await api.get("/invoices", { params: { page: 1, limit: DEFAULT_PAGE_SIZE } })).data,
        staleTime: LIST_STALE_MS,
      });
    }
    if (href === "/projects") {
      queryClient.prefetchQuery({
        queryKey: ["projects", 1],
        queryFn: async () =>
          (await api.get("/projects", { params: { page: 1, limit: DEFAULT_PAGE_SIZE } })).data,
        staleTime: LIST_STALE_MS,
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
    staleTime: TEAM_FEED_STALE_MS,
    refetchInterval: TEAM_FEED_STALE_MS,
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
      <RouteProgress color={routeColor.spark} />
      <aside
        className="sticky top-0 flex h-screen min-h-0 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground"
        style={{ width: "var(--sidebar-width)" }}
      >
        <div className="shrink-0 border-b border-border px-4 py-3.5">
          <TechPotliLogo size="md" className="items-start" />
        </div>
        <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-2.5 py-3">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-1 px-2.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active =
                    pathname === href ||
                    (href !== "/dashboard" && pathname.startsWith(href));
                  return (
                    <Link
                      key={href}
                      href={href}
                      onMouseEnter={() => prefetchRoute(href)}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                        active
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      )}
                    >
                      {active ? (
                        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-foreground" />
                      ) : null}
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                      {href === "/team-updates" && teamBadgeCount > 0 ? (
                        <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white tabular-nums">
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
        <div className="shrink-0 border-t border-border p-2.5">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-muted/80"
              >
                <UserAvatar name={user?.name ?? "User"} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{user?.name ?? "User"}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{roleLabel(user?.role)}</p>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
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
        <header className="sticky top-0 z-40 border-b border-border bg-card/95 px-4 py-2.5 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="hidden flex-1 md:flex md:max-w-md lg:max-w-lg">
              <GlobalSearch />
            </div>
            <div className="flex flex-1 items-center justify-end gap-1.5">
              <Link href="/leads" className="crm-btn-ghost !px-2.5" title="Follow-ups">
                <Calendar className="h-4 w-4" />
              </Link>
              <NotificationBell />
              {superAdmin ? (
                <Link href="/settings" className="crm-btn-ghost !px-2.5" title="Settings">
                  <Settings className="h-4 w-4" />
                </Link>
              ) : null}
              <ThemeToggle />
            </div>
          </div>
          <div className="mt-2 md:hidden">
            <GlobalSearch />
          </div>
        </header>
        <main className="flex-1 space-y-3 p-4 md:p-5">
          {showHero ? (
            <SectionHero
              group={pageMeta.group}
              title={pageMeta.title}
              description={pageMeta.description}
              color={routeColor}
              icon={PageIcon}
            />
          ) : null}
          {children}
        </main>
      </div>
      <TeamUpdateToast />
    </div>
  );
}
