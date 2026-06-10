import type { ComponentType } from "react";
import { LayoutDashboard } from "lucide-react";
import { NAV_GROUPS } from "@/lib/shell-nav-groups";
import { FEATURE, type FeatureColor } from "@/lib/feature-colors";

/** Pages that render their own inner hero */
export const PAGES_WITH_OWN_HERO = ["/dashboard", "/team-updates"];

/** Every sidebar route → accent palette */
export const ROUTE_COLORS: Record<string, FeatureColor> = {
  "/dashboard": {
    iconBg: "bg-blue-500/12",
    iconColor: "text-blue-600 dark:text-blue-400",
    spark: "#3b82f6",
    solid: "bg-blue-500",
    light: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-500/30",
    ring: "ring-blue-400/25",
    btn: "crm-btn-sky",
    hoverBg: "hover:bg-blue-50 dark:hover:bg-blue-950/30",
  },
  "/team-updates": FEATURE.teamUpdates,
  "/leads": FEATURE.leads,
  "/customers": FEATURE.customers,
  "/quotations": {
    iconBg: "bg-fuchsia-500/12",
    iconColor: "text-fuchsia-600 dark:text-fuchsia-400",
    spark: "#d946ef",
    solid: "bg-fuchsia-500",
    light: "bg-fuchsia-50 dark:bg-fuchsia-950/40",
    text: "text-fuchsia-700 dark:text-fuchsia-300",
    border: "border-fuchsia-200 dark:border-fuchsia-500/30",
    ring: "ring-fuchsia-400/25",
    btn: "crm-btn-fuchsia",
    hoverBg: "hover:bg-fuchsia-50 dark:hover:bg-fuchsia-950/30",
  },
  "/invoices": {
    iconBg: "bg-blue-500/12",
    iconColor: "text-blue-600 dark:text-blue-400",
    spark: "#2563eb",
    solid: "bg-blue-600",
    light: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-500/30",
    ring: "ring-blue-400/25",
    btn: "crm-btn-sky",
    hoverBg: "hover:bg-blue-50 dark:hover:bg-blue-950/30",
  },
  "/payments": FEATURE.converted,
  "/projects": {
    iconBg: "bg-purple-500/12",
    iconColor: "text-purple-600 dark:text-purple-400",
    spark: "#a855f7",
    solid: "bg-purple-500",
    light: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-500/30",
    ring: "ring-purple-400/25",
    btn: "crm-btn-violet",
    hoverBg: "hover:bg-purple-50 dark:hover:bg-purple-950/30",
  },
  "/renewals": {
    iconBg: "bg-orange-500/12",
    iconColor: "text-orange-600 dark:text-orange-400",
    spark: "#f97316",
    solid: "bg-orange-500",
    light: "bg-orange-50 dark:bg-orange-950/40",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-500/30",
    ring: "ring-orange-400/25",
    btn: "crm-btn-orange",
    hoverBg: "hover:bg-orange-50 dark:hover:bg-orange-950/30",
  },
  "/support": {
    iconBg: "bg-rose-500/12",
    iconColor: "text-rose-600 dark:text-rose-400",
    spark: "#f43f5e",
    solid: "bg-rose-500",
    light: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-500/30",
    ring: "ring-rose-400/25",
    btn: "crm-btn-rose",
    hoverBg: "hover:bg-rose-50 dark:hover:bg-rose-950/30",
  },
  "/employees": FEATURE.month,
  "/activity": FEATURE.all,
  "/notepad": {
    iconBg: "bg-yellow-500/12",
    iconColor: "text-yellow-600 dark:text-yellow-400",
    spark: "#eab308",
    solid: "bg-yellow-500",
    light: "bg-yellow-50 dark:bg-yellow-950/40",
    text: "text-yellow-700 dark:text-yellow-300",
    border: "border-yellow-200 dark:border-yellow-500/30",
    ring: "ring-yellow-400/25",
    btn: "crm-btn-amber",
    hoverBg: "hover:bg-yellow-50 dark:hover:bg-yellow-950/30",
  },
  "/profile": {
    iconBg: "bg-pink-500/12",
    iconColor: "text-pink-600 dark:text-pink-400",
    spark: "#ec4899",
    solid: "bg-pink-500",
    light: "bg-pink-50 dark:bg-pink-950/40",
    text: "text-pink-700 dark:text-pink-300",
    border: "border-pink-200 dark:border-pink-500/30",
    ring: "ring-pink-400/25",
    btn: "crm-btn-rose",
    hoverBg: "hover:bg-pink-50 dark:hover:bg-pink-950/30",
  },
  "/emails": FEATURE.customers,
  "/reports": FEATURE.leads,
  "/settings": FEATURE.all,
  "/approvals": FEATURE.converted,
  "/expenses": FEATURE.followups,
  "/notifications": {
    iconBg: "bg-orange-500/12",
    iconColor: "text-orange-600 dark:text-orange-400",
    spark: "#ea580c",
    solid: "bg-orange-500",
    light: "bg-orange-50 dark:bg-orange-950/40",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-500/30",
    ring: "ring-orange-400/25",
    btn: "crm-btn-orange",
    hoverBg: "hover:bg-orange-50 dark:hover:bg-orange-950/30",
  },
};

const SORTED_ROUTES = Object.keys(ROUTE_COLORS).sort((a, b) => b.length - a.length);

export function getRouteColor(pathname: string): FeatureColor {
  if (ROUTE_COLORS[pathname]) return ROUTE_COLORS[pathname];
  const prefix = SORTED_ROUTES.find(
    (route) => route !== "/dashboard" && pathname.startsWith(route + "/"),
  );
  if (prefix) return ROUTE_COLORS[prefix];
  return ROUTE_COLORS["/dashboard"];
}

/** Sidebar group label accents */
export const NAV_GROUP_COLORS: Record<string, FeatureColor> = {
  Main: ROUTE_COLORS["/dashboard"],
  "Leads & Sales": FEATURE.leads,
  Delivery: FEATURE.revenue,
  Team: FEATURE.month,
  Other: FEATURE.all,
};

/** Role badge in profile footer */
export const ROLE_COLORS: Record<string, FeatureColor> = {
  SUPER_ADMIN: {
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-600",
    spark: "#f59e0b",
    solid: "bg-amber-500",
    light: "bg-amber-50 dark:bg-amber-950/50",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-300 dark:border-amber-500/40",
    ring: "ring-amber-400/30",
    btn: "crm-btn-amber",
    hoverBg: "hover:bg-amber-50 dark:hover:bg-amber-950/40",
  },
  ADMIN: FEATURE.leads,
  EMPLOYEE: FEATURE.customers,
  default: FEATURE.all,
};

export function getRoleColor(role?: string): FeatureColor {
  if (role && ROLE_COLORS[role]) return ROLE_COLORS[role];
  return ROLE_COLORS.default;
}

export function getPageIcon(pathname: string): ComponentType<{ className?: string }> {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"))) {
        return item.icon;
      }
    }
  }
  return LayoutDashboard;
}

export function shouldShowSectionHero(pathname: string): boolean {
  if (PAGES_WITH_OWN_HERO.includes(pathname)) return false;
  return true;
}
