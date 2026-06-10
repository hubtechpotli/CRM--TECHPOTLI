"use client";

import { cn } from "@/lib/utils";

export function FormShell({
  children,
  footer,
  className,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex max-h-[min(78vh,720px)] flex-col", className)}>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">{children}</div>
      {footer ? (
        <div className="shrink-0 border-t border-border bg-muted/20 px-5 py-3.5">{footer}</div>
      ) : null}
    </div>
  );
}

export function FormFooterActions({
  onCancel,
  submitLabel,
  pending,
  pendingLabel = "Saving…",
}: {
  onCancel?: () => void;
  submitLabel: string;
  pending?: boolean;
  pendingLabel?: string;
}) {
  return (
    <div className="flex justify-end gap-2">
      {onCancel ? (
        <button type="button" onClick={onCancel} className="crm-btn-ghost">
          Cancel
        </button>
      ) : null}
      <button type="submit" disabled={pending} className="crm-btn-primary min-w-[7rem]">
        {pending ? pendingLabel : submitLabel}
      </button>
    </div>
  );
}
