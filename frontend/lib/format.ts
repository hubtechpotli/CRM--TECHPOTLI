export function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatMoney(value: unknown) {
  const n = Number(value ?? 0);
  return `₹${n.toLocaleString("en-IN")}`;
}

export function formatDate(value: unknown) {
  if (!value) return "—";
  return new Date(String(value)).toLocaleDateString();
}

export function formatDateTime(value: unknown) {
  if (!value) return "—";
  return new Date(String(value)).toLocaleString();
}

export function timeAgo(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
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
