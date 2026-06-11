import { FEATURE, type FeatureColor } from "@/lib/feature-colors";

const MODULE_COLORS: Record<string, FeatureColor> = {
  lead: FEATURE.leads,
  leads: FEATURE.leads,
  customer: FEATURE.customers,
  customers: FEATURE.customers,
  project: FEATURE.inProgress,
  projects: FEATURE.inProgress,
  invoice: FEATURE.revenue,
  invoices: FEATURE.revenue,
  quotation: FEATURE.teamUpdates,
  quotations: FEATURE.teamUpdates,
  payment: FEATURE.converted,
  payments: FEATURE.converted,
  expense: FEATURE.followups,
  expenses: FEATURE.followups,
  support: FEATURE.mine,
  renewal: FEATURE.unassigned,
  renewals: FEATURE.unassigned,
  user: FEATURE.month,
  employee: FEATURE.month,
  employees: FEATURE.month,
};

export function moduleColorFor(module: string): FeatureColor {
  return MODULE_COLORS[module.trim().toLowerCase()] ?? FEATURE.all;
}

export type ActionBadgeStyle = {
  light: string;
  text: string;
  border: string;
  label: string;
};

export function actionBadgeFor(action: string): ActionBadgeStyle {
  const key = action.trim().toLowerCase();
  if (key === "create" || key === "created") {
    return {
      light: "bg-emerald-50 dark:bg-emerald-950/40",
      text: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-200 dark:border-emerald-500/35",
      label: "Created",
    };
  }
  if (key === "update" || key === "updated") {
    return {
      light: "bg-amber-50 dark:bg-amber-950/40",
      text: "text-amber-700 dark:text-amber-300",
      border: "border-amber-200 dark:border-amber-500/35",
      label: "Updated",
    };
  }
  if (key === "delete" || key === "deleted" || key === "remove" || key === "removed") {
    return {
      light: "bg-rose-50 dark:bg-rose-950/40",
      text: "text-rose-700 dark:text-rose-300",
      border: "border-rose-200 dark:border-rose-500/35",
      label: "Deleted",
    };
  }
  return {
    light: "bg-slate-50 dark:bg-slate-900/40",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-500/35",
    label: action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  };
}
