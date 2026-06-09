export type AppRole = "SUPER_ADMIN" | "ADMIN" | "EMPLOYEE" | string;

const NAV_BY_ROLE: Record<string, string[]> = {
  EMPLOYEE: ["/dashboard", "/leads", "/customers", "/emails", "/projects", "/support", "/team-updates", "/notifications", "/profile"],
  ADMIN: [
    "/dashboard",
    "/leads",
    "/customers",
    "/emails",
    "/projects",
    "/invoices",
    "/quotations",
    "/payments",
    "/renewals",
    "/reports",
    "/support",
    "/team-updates",
    "/activity",
    "/notifications",
    "/profile",
  ],
  SUPER_ADMIN: [
    "/dashboard",
    "/leads",
    "/customers",
    "/emails",
    "/projects",
    "/invoices",
    "/quotations",
    "/payments",
    "/renewals",
    "/employees",
    "/expenses",
    "/reports",
    "/support",
    "/settings",
    "/approvals",
    "/team-updates",
    "/activity",
    "/notifications",
    "/profile",
  ],
};

export function canAccessNav(role: AppRole | undefined, href: string) {
  if (!role) return true;
  const allowed = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.SUPER_ADMIN;
  return allowed.includes(href);
}

export function isAdmin(role: AppRole | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function isSuperAdmin(role: AppRole | undefined) {
  return role === "SUPER_ADMIN";
}

export function isEmployee(role: AppRole | undefined) {
  return role === "EMPLOYEE";
}
