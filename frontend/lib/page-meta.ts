export type PageMeta = {
  title: string;
  description: string;
  group: string;
};

export const PAGE_META: Record<string, PageMeta> = {
  "/dashboard": {
    title: "Dashboard",
    description: "Pipeline overview, KPIs, and team activity at a glance.",
    group: "Main",
  },
  "/team-updates": {
    title: "Team Updates",
    description: "Assign tasks, @mention teammates, and track open work.",
    group: "Main",
  },
  "/leads": {
    title: "Leads",
    description: "Track prospects from first contact through to close.",
    group: "Leads & Sales",
  },
  "/customers": {
    title: "Customers",
    description: "Manage accounts, services, and customer relationships.",
    group: "Leads & Sales",
  },
  "/quotations": {
    title: "Quotations",
    description: "Create and send quotes before invoicing.",
    group: "Leads & Sales",
  },
  "/invoices": {
    title: "Invoices",
    description: "Billing documents and payment status.",
    group: "Leads & Sales",
  },
  "/payments": {
    title: "Collections",
    description: "Recorded payments and collection follow-ups.",
    group: "Leads & Sales",
  },
  "/projects": {
    title: "Projects",
    description: "Delivery pipeline, milestones, and project health.",
    group: "Delivery",
  },
  "/renewals": {
    title: "Renewals",
    description: "Upcoming domain, hosting, and service renewals.",
    group: "Delivery",
  },
  "/support": {
    title: "Support",
    description: "Customer tickets and support requests.",
    group: "Delivery",
  },
  "/employees": {
    title: "Employees",
    description: "Team members, roles, and access.",
    group: "Team",
  },
  "/activity": {
    title: "Activity",
    description: "Audit trail across leads, customers, and billing.",
    group: "Team",
  },
  "/notepad": {
    title: "Notepad",
    description: "Quick notes and personal scratchpad.",
    group: "Other",
  },
  "/profile": {
    title: "Profile",
    description: "Your account, security, and preferences.",
    group: "Other",
  },
  "/emails": {
    title: "Email Center",
    description: "Send templated emails to leads and customers.",
    group: "Other",
  },
  "/reports": {
    title: "Reports",
    description: "Revenue, MRR, and team performance analytics.",
    group: "Other",
  },
  "/settings": {
    title: "Settings",
    description: "Organization configuration and integrations.",
    group: "Other",
  },
  "/approvals": {
    title: "Approvals",
    description: "Pending requests requiring your sign-off.",
    group: "Other",
  },
  "/expenses": {
    title: "Expenses",
    description: "Team expenses and reimbursement workflow.",
    group: "Other",
  },
  "/notifications": {
    title: "Notifications",
    description: "Alerts, mentions, and system updates.",
    group: "Other",
  },
};

const SORTED_KEYS = Object.keys(PAGE_META).sort((a, b) => b.length - a.length);

export function resolvePageMeta(pathname: string): PageMeta {
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  const prefix = SORTED_KEYS.find(
    (key) => key !== "/dashboard" && pathname.startsWith(key + "/"),
  );
  if (prefix) return PAGE_META[prefix];
  return {
    title: "TechPotli",
    description: "CRM workspace",
    group: "Main",
  };
}
