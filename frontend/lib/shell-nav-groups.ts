import type { ComponentType } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  CheckSquare,
  CreditCard,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  MessageSquare,
  Receipt,
  RefreshCw,
  Settings,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/team-updates", label: "Team Updates", icon: MessageSquare },
    ],
  },
  {
    label: "Leads & Sales",
    items: [
      { href: "/leads", label: "Leads", icon: UserPlus },
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/quotations", label: "Quotations", icon: FileSpreadsheet },
      { href: "/invoices", label: "Invoices", icon: FileText },
      { href: "/payments", label: "Payments", icon: CreditCard },
    ],
  },
  {
    label: "Delivery",
    items: [
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/renewals", label: "Renewals", icon: RefreshCw },
      { href: "/support", label: "Support", icon: LifeBuoy },
    ],
  },
  {
    label: "Team",
    items: [
      { href: "/employees", label: "Employees", icon: UserCog },
      { href: "/activity", label: "Activity", icon: Activity },
    ],
  },
  {
    label: "Other",
    items: [
      { href: "/emails", label: "Email Center", icon: Mail },
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/approvals", label: "Approvals", icon: CheckSquare },
      { href: "/expenses", label: "Expenses", icon: Receipt },
      { href: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
];

export function roleLabel(role?: string) {
  if (role === "SUPER_ADMIN") return "Super Admin";
  if (role === "ADMIN") return "Admin";
  if (role === "EMPLOYEE") return "Salesperson";
  return role ?? "User";
}

export const PAGE_CTAS: Record<string, { label: string; href: string }> = {
  "/dashboard": { label: "New Lead", href: "/leads?new=1" },
  "/leads": { label: "New Lead", href: "/leads?new=1" },
  "/customers": { label: "New Customer", href: "/customers?new=1" },
  "/projects": { label: "New Project", href: "/projects?new=1" },
};
