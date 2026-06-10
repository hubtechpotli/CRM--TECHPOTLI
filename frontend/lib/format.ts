function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** dd/mm/yyyy */
export function formatDate(value: unknown) {
  const d = parseDate(value);
  if (!d) return "—";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** dd/mm/yyyy, hh:mm */
export function formatDateTime(value: unknown) {
  const d = parseDate(value);
  if (!d) return "—";
  return `${formatDate(d)}, ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** dd/mm for compact chart labels */
export function formatDateShort(value: unknown) {
  const d = parseDate(value);
  if (!d) return "—";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
}

export function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatMoney(value: unknown) {
  const n = Number(value ?? 0);
  return `₹${n.toLocaleString("en-IN")}`;
}

export function timeAgo(value: unknown) {
  if (!value) return "";
  const date = parseDate(value);
  if (!date) return "";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(value);
}

export function activityLink(module: string, recordId?: string | null) {
  if (!recordId) return null;
  const routes: Record<string, string> = {
    lead: `/leads/${recordId}`,
    customer: `/customers/${recordId}`,
    project: `/projects/${recordId}`,
    invoice: `/invoices/${recordId}`,
    quotation: `/quotations/${recordId}`,
    payment: `/payments`,
    renewal: `/renewals/${recordId}`,
  };
  return routes[module] ?? null;
}
