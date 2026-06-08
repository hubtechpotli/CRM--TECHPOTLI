"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Check, Mail, Send, Sparkles, User } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { TechPotliLogo } from "@/components/brand/techpotli-logo";
import { GlassCard } from "@/components/ui/glass-card";
import { FormField, TextArea, TextInput } from "@/components/ui/form-field";
import { RecipientPicker, Recipient, RecipientType } from "@/components/email/recipient-picker";
import { EmailPreview } from "@/components/email/email-preview";

type Purpose = { id: string; label: string; description: string };

type Draft = {
  to: string | null;
  subject: string;
  body: string;
  contactName?: string;
  companyName?: string;
};

const STEPS = [
  { id: 1, label: "Recipient" },
  { id: 2, label: "Purpose" },
  { id: 3, label: "Draft" },
  { id: 4, label: "Review & Send" },
] as const;

const SEND_FORM_ID = "email-send-form";

function AlertBanner({ type, text }: { type: "ok" | "err"; text: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        type === "ok"
          ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300"
          : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
      )}
    >
      {text}
    </div>
  );
}

export default function EmailCenterPage() {
  const [recipientType, setRecipientType] = useState<RecipientType>("lead");
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [purpose, setPurpose] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [bodyMode, setBodyMode] = useState<"preview" | "edit">("preview");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const recipientId = selectedRecipient?.id ?? "";

  const { data: purposes = [] } = useQuery({
    queryKey: ["email-purposes", recipientType],
    queryFn: async () => {
      const res = await api.get<Purpose[]>("/email/purposes", { params: { recipientType } });
      return res.data;
    },
  });

  const currentStep = useMemo(() => {
    if (subject || body) return 4;
    if (purpose) return 3;
    if (selectedRecipient) return 2;
    return 1;
  }, [selectedRecipient, purpose, subject, body]);

  useEffect(() => {
    setSelectedRecipient(null);
    setPurpose("");
    setTo("");
    setSubject("");
    setBody("");
    setMessage(null);
  }, [recipientType]);

  useEffect(() => {
    setPurpose("");
    setSubject("");
    setBody("");
  }, [recipientId]);

  useEffect(() => {
    if (selectedRecipient) {
      setTo(selectedRecipient.email || "");
    }
  }, [selectedRecipient]);

  const composeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<Draft>("/email/compose", {
        recipientType,
        recipientId,
        purpose,
      });
      return res.data;
    },
    onSuccess: (draft) => {
      setTo(draft.to || "");
      setSubject(draft.subject);
      setBody(draft.body);
      setBodyMode("preview");
      setMessage({ type: "ok", text: "Email draft generated — review and edit before sending." });
    },
    onError: (err: unknown) => {
      setMessage({
        type: "err",
        text: isAxiosError(err)
          ? String((err.response?.data as { message?: string })?.message ?? err.message)
          : "Failed to generate draft",
      });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ sent: boolean; to: string; subject: string }>("/email/send", {
        recipientType,
        recipientId,
        purpose,
        to,
        subject,
        body,
      });
      return res.data;
    },
    onSuccess: (result) => {
      setMessage({
        type: "ok",
        text: result.sent
          ? `Email sent to ${result.to}`
          : `Email saved (mail not configured). Subject: ${result.subject}`,
      });
    },
    onError: (err: unknown) => {
      setMessage({
        type: "err",
        text: isAxiosError(err)
          ? String((err.response?.data as { message?: string })?.message ?? err.message)
          : "Failed to send email",
      });
    },
  });

  function handleCompose(e: FormEvent) {
    e.preventDefault();
    if (composeMutation.isPending) return;
    if (!recipientId || !purpose) {
      setMessage({ type: "err", text: "Select a recipient and email purpose first." });
      return;
    }
    composeMutation.mutate();
  }

  function handleSend(e: FormEvent) {
    e.preventDefault();
    if (sendMutation.isPending) return;
    if (!recipientId || !purpose || !to || !subject || !body) {
      setMessage({ type: "err", text: "Fill in recipient, purpose, To, subject, and body." });
      return;
    }
    sendMutation.mutate();
  }

  const contactName =
    recipientType === "lead" ? selectedRecipient?.contactName : selectedRecipient?.ownerName;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-20 lg:pb-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <TechPotliLogo size="sm" className="items-start shrink-0" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Email Center</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Compose professional branded emails to leads and customers.
            </p>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {STEPS.map((step) => (
          <div
            key={step.id}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition",
              currentStep >= step.id
                ? "border-primary/30 bg-primary/5 text-primary"
                : "border-border text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                currentStep >= step.id ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              {currentStep > step.id ? <Check className="h-3.5 w-3.5" /> : step.id}
            </span>
            <span className="font-medium">{step.label}</span>
          </div>
        ))}
      </div>

      {message ? <AlertBanner type={message.type} text={message.text} /> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Compose controls */}
        <div className="space-y-6">
          <GlassCard>
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="rounded-lg bg-primary/10 p-2">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">1. Choose recipient</h2>
                <p className="text-xs text-muted-foreground">Search and select a lead or customer.</p>
              </div>
            </div>

            <form onSubmit={handleCompose} className="mt-4 space-y-4">
              <FormField label="Send to">
                <div className="flex gap-2">
                  {(["lead", "customer"] as RecipientType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setRecipientType(t)}
                      className={cn(
                        "flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium capitalize transition",
                        recipientType === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </FormField>

              <FormField label={`Select ${recipientType}`}>
                <RecipientPicker
                  type={recipientType}
                  value={selectedRecipient}
                  onChange={setSelectedRecipient}
                />
              </FormField>

              {selectedRecipient ? (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground">{selectedRecipient.companyName}</p>
                      {contactName ? (
                        <p className="text-sm text-muted-foreground">{contactName}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selectedRecipient.email || "No email on file"}
                        {selectedRecipient.status ? ` · ${selectedRecipient.status}` : ""}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="border-t border-border pt-4">
                <h3 className="mb-3 font-semibold">2. Email purpose</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {purposes.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPurpose(p.id)}
                      className={cn(
                        "rounded-lg border p-3 text-left transition",
                        purpose === p.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border hover:border-primary/30 hover:bg-muted/50",
                      )}
                    >
                      <p className="text-sm font-medium text-foreground">{p.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={composeMutation.isPending || !recipientId || !purpose}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60 sm:w-auto"
              >
                <Sparkles className="h-4 w-4" />
                {composeMutation.isPending ? "Writing draft…" : "3. Generate email draft"}
              </button>
            </form>
          </GlassCard>

          {(subject || body || to) && (
            <GlassCard>
              <h3 className="font-semibold">4. Review & send</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Edit any field before sending.</p>

              <form id={SEND_FORM_ID} onSubmit={handleSend} className="mt-4 space-y-4">
                <FormField label="To">
                  <TextInput
                    value={to}
                    onChange={setTo}
                    type="email"
                    placeholder="recipient@email.com"
                    required
                  />
                </FormField>

                <FormField label="Subject">
                  <TextInput value={subject} onChange={setSubject} required />
                </FormField>

                <FormField label="Body">
                  <div className="mb-2 flex gap-1 rounded-lg border border-border p-0.5">
                    <button
                      type="button"
                      onClick={() => setBodyMode("preview")}
                      className={cn(
                        "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition",
                        bodyMode === "preview" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                      )}
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => setBodyMode("edit")}
                      className={cn(
                        "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition",
                        bodyMode === "edit" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                      )}
                    >
                      Edit HTML
                    </button>
                  </div>
                  {bodyMode === "edit" ? (
                    <TextArea value={body} onChange={setBody} rows={10} required />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Preview shown on the right. Switch to Edit HTML to modify the message.
                    </p>
                  )}
                </FormField>

                <button
                  type="submit"
                  disabled={sendMutation.isPending || !to || !subject || !body}
                  className="hidden w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60 lg:inline-flex"
                >
                  <Send className="h-4 w-4" />
                  {sendMutation.isPending ? "Sending…" : "Send email"}
                </button>
              </form>
            </GlassCard>
          )}
        </div>

        {/* Right: Live preview */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <GlassCard className="p-0 overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <h3 className="font-semibold">Live preview</h3>
              <p className="text-xs text-muted-foreground">How your email will appear to the recipient.</p>
            </div>
            <div className="p-4">
              <EmailPreview to={to} subject={subject} bodyHtml={body} className="min-h-[400px]" />
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Mobile sticky send bar */}
      {(subject || body) && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur lg:hidden">
          <button
            type="submit"
            form={SEND_FORM_ID}
            disabled={sendMutation.isPending || !to || !subject || !body}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {sendMutation.isPending ? "Sending…" : `Send to ${to || "recipient"}`}
          </button>
        </div>
      )}
    </div>
  );
}
