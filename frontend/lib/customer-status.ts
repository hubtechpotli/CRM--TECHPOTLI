export type CustomerStatusValue = "ACTIVE" | "INACTIVE" | "CHURNED";

export const CUSTOMER_STATUSES = [
  { value: "ACTIVE" as const, label: "Active", hint: "Current client" },
  { value: "INACTIVE" as const, label: "Inactive", hint: "Paused — services off, may return" },
  {
    value: "CHURNED" as const,
    label: "Completely closed",
    hint: "All services ended — account stays in CRM; set Active again if they return",
  },
];

export const CUSTOMER_STATUS_FILTER_TABS = [
  { value: "", label: "All" },
  ...CUSTOMER_STATUSES.map((s) => ({ value: s.value, label: s.label })),
];

export function customerStatusLabel(value: string | null | undefined): string {
  const match = CUSTOMER_STATUSES.find((s) => s.value === value);
  return match?.label ?? "Active";
}

export function customerStatusHint(value: string | null | undefined): string | undefined {
  return CUSTOMER_STATUSES.find((s) => s.value === value)?.hint;
}

export function customerStatusBadgeClass(value: string | null | undefined): string {
  const status = value ?? "ACTIVE";
  if (status === "ACTIVE") {
    return "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-300";
  }
  if (status === "CHURNED") {
    return "bg-amber-500/10 text-amber-800 border-amber-500/25 dark:text-amber-300";
  }
  return "bg-slate-500/10 text-slate-600 border-slate-500/25 dark:text-slate-400";
}

export function confirmCustomerStatusChange(
  next: CustomerStatusValue,
  current: CustomerStatusValue,
): boolean {
  if (next === current) return true;
  if (next === "INACTIVE") {
    return window.confirm(
      "Mark as Inactive? Customer stays in CRM; use Services tab to turn off individual services.",
    );
  }
  if (next === "CHURNED") {
    return window.confirm(
      "Mark as completely closed? All services are treated as ended for now. The customer stays in CRM — you can set them Active again if they come back.",
    );
  }
  return true;
}
