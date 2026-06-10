"use client";

import { FormEvent, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { GlassCard } from "@/components/ui/glass-card";
import { TechPotliLogo } from "@/components/brand/techpotli-logo";
import { formatDate } from "@/lib/format";

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type Tab = "overview" | "services" | "projects" | "invoices" | "payments" | "renewals" | "support" | "quotations";

type PortalData = Record<string, unknown> & {
  companyName?: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  services?: Array<Record<string, unknown>>;
  projects?: Array<Record<string, unknown>>;
  invoices?: Array<Record<string, unknown>>;
  payments?: Array<Record<string, unknown>>;
  renewals?: Array<Record<string, unknown>>;
  supportTickets?: Array<Record<string, unknown>>;
  quotations?: Array<Record<string, unknown>>;
};

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "services", label: "Services" },
  { id: "projects", label: "Projects" },
  { id: "invoices", label: "Invoices" },
  { id: "payments", label: "Payments" },
  { id: "renewals", label: "Renewals" },
  { id: "support", label: "Support" },
  { id: "quotations", label: "Quotations" },
];

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PortalPage() {
  const params = useParams();
  const token = String(params.token);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["portal", token],
    queryFn: async () => {
      const res = await axios.get<PortalData>(`${baseURL}/portal/${token}`);
      return res.data;
    },
  });

  const ticketMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.post(`${baseURL}/portal/${token}/tickets`, { subject, description });
      return res.data;
    },
    onSuccess: () => {
      setSubject("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["portal", token] });
      queryClient.invalidateQueries({ queryKey: ["portal-tickets", token] });
    },
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["portal-tickets", token],
    queryFn: async () => {
      const res = await axios.get<Array<Record<string, unknown>>>(`${baseURL}/portal/${token}/tickets`);
      return res.data;
    },
    enabled: tab === "support",
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading portal…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <GlassCard className="max-w-md text-center">
          <p className="text-lg font-semibold">Invalid or expired link</p>
          <p className="mt-2 text-sm text-muted-foreground">Please contact TechPotli for a new portal link.</p>
        </GlassCard>
      </div>
    );
  }

  const displayTickets = tab === "support" && tickets.length ? tickets : data.supportTickets ?? [];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="text-center">
          <TechPotliLogo size="md" className="mx-auto" />
          <p className="mt-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">Client Portal</p>
          <h1 className="mt-2 text-3xl font-bold">{data.companyName}</h1>
          {data.ownerName ? <p className="mt-1 text-sm text-muted-foreground">{data.ownerName}</p> : null}
        </header>

        <div className="flex flex-wrap justify-center gap-1 rounded-lg border border-border bg-white/60 p-0.5 text-xs dark:bg-background/60">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-md px-3 py-1.5 ${tab === t.id ? "bg-primary text-primary-foreground" : ""}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <GlassCard>
              <h2 className="mb-3 text-sm font-semibold">Contact</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Email</dt><dd>{String(data.email ?? "—")}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Phone</dt><dd>{String(data.phone ?? "—")}</dd></div>
              </dl>
            </GlassCard>
            <GlassCard>
              <h2 className="mb-3 text-sm font-semibold">Quick summary</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Active services</dt><dd>{(data.services ?? []).length}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Projects</dt><dd>{(data.projects ?? []).length}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Open quotations</dt><dd>{(data.quotations ?? []).length}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Support tickets</dt><dd>{(data.supportTickets ?? []).length}</dd></div>
              </dl>
            </GlassCard>
          </div>
        ) : null}

        {tab === "services" ? (
          <GlassCard>
            <h2 className="mb-3 text-sm font-semibold">Active services</h2>
            <ul className="space-y-2 text-sm">
              {(data.services ?? []).map((s) => (
                <li key={String(s.id)} className="flex justify-between border-b border-border/40 pb-2">
                  <span>{formatLabel(String(s.serviceType ?? "Service"))}</span>
                  <span className="text-muted-foreground">
                    {s.monthlyAmount ? `₹${s.monthlyAmount}/mo` : s.oneTimeAmount ? `₹${s.oneTimeAmount}` : "—"}
                  </span>
                </li>
              ))}
              {!data.services?.length ? <li className="text-muted-foreground">No active services</li> : null}
            </ul>
          </GlassCard>
        ) : null}

        {tab === "projects" ? (
          <GlassCard>
            <h2 className="mb-3 text-sm font-semibold">Projects</h2>
            <ul className="space-y-2 text-sm">
              {(data.projects ?? []).map((p) => (
                <li key={String(p.id)} className="flex justify-between border-b border-border/40 pb-2">
                  <span className="font-medium">{String(p.name ?? "—")}</span>
                  <span className="text-muted-foreground">{formatLabel(String(p.status ?? "—"))} · {Number(p.progress ?? 0)}%</span>
                </li>
              ))}
              {!data.projects?.length ? <li className="text-muted-foreground">No projects</li> : null}
            </ul>
          </GlassCard>
        ) : null}

        {tab === "invoices" ? (
          <GlassCard>
            <h2 className="mb-3 text-sm font-semibold">Invoices</h2>
            <ul className="space-y-2 text-sm">
              {(data.invoices ?? []).map((inv) => (
                <li key={String(inv.id)} className="flex justify-between border-b border-border/40 pb-2">
                  <span>{String(inv.invoiceNumber)}</span>
                  <span>₹{String(inv.grandTotal ?? 0)} · {String(inv.status ?? "—")}</span>
                </li>
              ))}
              {!data.invoices?.length ? <li className="text-muted-foreground">No invoices</li> : null}
            </ul>
          </GlassCard>
        ) : null}

        {tab === "payments" ? (
          <GlassCard>
            <h2 className="mb-3 text-sm font-semibold">Payments</h2>
            <ul className="space-y-2 text-sm">
              {(data.payments ?? []).map((p) => (
                <li key={String(p.id)} className="flex justify-between border-b border-border/40 pb-2">
                  <span>₹{String(p.paidAmount ?? p.totalAmount ?? 0)}</span>
                  <span className="text-muted-foreground">{String(p.status ?? "—")} · {p.createdAt ? formatDate(p.createdAt) : "—"}</span>
                </li>
              ))}
              {!data.payments?.length ? <li className="text-muted-foreground">No payments</li> : null}
            </ul>
          </GlassCard>
        ) : null}

        {tab === "renewals" ? (
          <GlassCard>
            <h2 className="mb-3 text-sm font-semibold">Upcoming renewals</h2>
            <ul className="space-y-2 text-sm">
              {(data.renewals ?? []).map((r) => (
                <li key={String(r.id)} className="flex justify-between border-b border-border/40 pb-2">
                  <span>{String(r.serviceName ?? r.type ?? "Renewal")}</span>
                  <span>{r.renewalDate ? formatDate(r.renewalDate) : "—"}</span>
                </li>
              ))}
              {!data.renewals?.length ? <li className="text-muted-foreground">No renewals</li> : null}
            </ul>
          </GlassCard>
        ) : null}

        {tab === "quotations" ? (
          <GlassCard>
            <h2 className="mb-3 text-sm font-semibold">Quotations awaiting review</h2>
            <ul className="space-y-2 text-sm">
              {(data.quotations ?? []).map((q) => (
                <li key={String(q.id)} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
                  <span className="font-medium">{String(q.quotationNumber ?? "—")}</span>
                  <span>₹{String(q.grandTotal ?? 0)}</span>
                  <span className="text-muted-foreground">Valid until {q.validUntil ? formatDate(q.validUntil) : "—"}</span>
                  {q.approvalToken ? (
                    <a
                      href={`/quote/approve/${q.approvalToken}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Review & approve
                    </a>
                  ) : null}
                </li>
              ))}
              {!data.quotations?.length ? <li className="text-muted-foreground">No pending quotations</li> : null}
            </ul>
          </GlassCard>
        ) : null}

        {tab === "support" ? (
          <div className="space-y-4">
            <GlassCard>
              <h2 className="mb-3 text-sm font-semibold">Your support tickets</h2>
              <ul className="space-y-2 text-sm">
                {displayTickets.map((t) => (
                  <li key={String(t.id)} className="border-b border-border/40 pb-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{String(t.subject ?? "—")}</span>
                      <span className="text-xs text-muted-foreground">{String(t.status ?? "—")}</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">{String(t.ticketNumber ?? "")}</p>
                  </li>
                ))}
                {!displayTickets.length ? <li className="text-muted-foreground">No tickets yet</li> : null}
              </ul>
            </GlassCard>
            <GlassCard>
              <h2 className="mb-3 text-sm font-semibold">Raise a support ticket</h2>
              {ticketMutation.isSuccess ? (
                <p className="text-sm text-green-600">Ticket submitted. Our team will respond shortly.</p>
              ) : (
                <form
                  onSubmit={(e: FormEvent) => {
                    e.preventDefault();
                    ticketMutation.mutate();
                  }}
                  className="space-y-3"
                >
                  <input
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Subject"
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  />
                  <textarea
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your issue"
                    rows={4}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={ticketMutation.isPending}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                  >
                    {ticketMutation.isPending ? "Submitting…" : "Submit ticket"}
                  </button>
                </form>
              )}
            </GlassCard>
          </div>
        ) : null}
      </div>
    </div>
  );
}
