"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Send } from "lucide-react";
import { api } from "@/lib/api";
import { isAdmin } from "@/lib/roles";
import { useAuthStore } from "@/store/auth-store";
import { GlassCard } from "@/components/ui/glass-card";
import { FormField, SelectInput, TextArea } from "@/components/ui/form-field";
import { EmailPreview as EmailHtmlPreview } from "@/components/email/email-preview";

type NotifyTemplate = {
  id: string;
  label: string;
  subject: string;
  preview: string;
  urgency: "info" | "warning" | "critical";
};

type EmailPreviewData = {
  to?: string | null;
  subject: string;
  pendingTotal: number;
  paymentCount: number;
  invoiceCount: number;
  template: NotifyTemplate;
  bodyHtml?: string;
};

function formatMoney(value: number) {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const urgencyStyles: Record<NotifyTemplate["urgency"], string> = {
  info: "bg-muted text-foreground",
  warning: "bg-amber-500/10 text-amber-700",
  critical: "bg-red-500/10 text-red-600",
};

const DEFAULT_REASON_OPTIONS = [
  { value: "PAYMENT_PENDING", label: "Payment pending" },
  { value: "PAYMENT_OVERDUE", label: "Payment overdue" },
  { value: "MAINTENANCE_CLOSURE", label: "Maintenance — website closure" },
  { value: "RENEWAL_DUE", label: "Renewal payment due" },
];

export function CustomerEmailPanel({
  customerId,
  customerEmail,
}: {
  customerId: string;
  customerEmail?: string | null;
}) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const admin = isAdmin(user?.role);
  const [reason, setReason] = useState("PAYMENT_PENDING");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const { data: templates = [] } = useQuery({
    queryKey: ["customer-notify-templates"],
    queryFn: async () => {
      const res = await api.get<NotifyTemplate[]>("/customers/notify/templates");
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: admin,
  });

  const { data: preview, isFetching: previewLoading } = useQuery({
    queryKey: ["customer-email-preview", customerId, reason],
    queryFn: async () => {
      const res = await api.get<EmailPreviewData>(`/customers/${customerId}/email-preview`, {
        params: { reason },
      });
      return res.data;
    },
    enabled: admin && !!reason,
  });

  useEffect(() => {
    setMessage(null);
  }, [reason]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ sent: boolean; to: string; subject: string }>(
        `/customers/${customerId}/send-email`,
        { reason, notes: notes.trim() || undefined },
      );
      return res.data;
    },
    onSuccess: (result) => {
      setMessage({
        type: "ok",
        text: result.sent
          ? `Email sent to ${result.to}`
          : `Email skipped (mail not configured). Subject: ${result.subject}`,
      });
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["customer-timeline", customerId] });
    },
    onError: (err: unknown) => {
      const text =
        err && typeof err === "object" && "response" in err
          ? String((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Failed to send email")
          : "Failed to send email";
      setMessage({ type: "err", text });
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (sendMutation.isPending) return;
    if (!customerEmail && !preview?.to) {
      setMessage({ type: "err", text: "Customer has no email address. Add it on the Edit tab first." });
      return;
    }
    sendMutation.mutate();
  }

  if (!admin) return null;

  const reasonOptions =
    templates.length > 0
      ? templates.map((t) => ({ value: t.id, label: t.label }))
      : DEFAULT_REASON_OPTIONS;

  const selectedTemplate = preview?.template ?? templates.find((t) => t.id === reason);

  return (
    <GlassCard>
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Mail className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">Send customer email</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Choose a reason — subject and message are filled automatically with pending payment details.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <FormField label="Reason">
          <SelectInput value={reason} onChange={setReason} options={reasonOptions} />
        </FormField>

        {selectedTemplate || preview ? (
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
            {selectedTemplate ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${urgencyStyles[selectedTemplate.urgency]}`}>
                  {selectedTemplate.urgency === "critical" ? "Critical" : selectedTemplate.urgency === "warning" ? "Urgent" : "Reminder"}
                </span>
                <span className="text-xs text-muted-foreground">{selectedTemplate.preview}</span>
              </div>
            ) : null}
            <p className="mt-2 font-medium text-foreground">
              Subject: {preview?.subject ?? selectedTemplate?.subject ?? "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              To: {preview?.to || customerEmail || "—"}
              {previewLoading ? " · loading…" : preview ? ` · Outstanding: ${formatMoney(preview.pendingTotal)}` : null}
            </p>
          </div>
        ) : null}

        <FormField label="Optional note (appended to email)">
          <TextArea
            value={notes}
            onChange={setNotes}
            rows={2}
            placeholder="e.g. Please share payment screenshot after transfer"
          />
        </FormField>

        {preview?.bodyHtml ? (
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Email preview</p>
            <EmailHtmlPreview
              to={preview.to || customerEmail || undefined}
              subject={preview.subject}
              bodyHtml={preview.bodyHtml}
              className="min-h-[280px]"
            />
          </div>
        ) : previewLoading ? (
          <p className="text-sm text-muted-foreground">Loading preview…</p>
        ) : null}

        {message ? (
          <p className={`text-sm ${message.type === "ok" ? "text-green-600" : "text-red-500"}`}>{message.text}</p>
        ) : null}

        <button
          type="submit"
          disabled={sendMutation.isPending || (!customerEmail && !preview?.to)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
          {sendMutation.isPending ? "Sending…" : "Send email"}
        </button>
      </form>
    </GlassCard>
  );
}
