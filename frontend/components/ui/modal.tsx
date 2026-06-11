"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onOpenChange,
  onClose,
  title,
  description,
  children,
  className,
  size = "md",
  accent: _accent = "indigo",
}: {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  /** @deprecated Use onOpenChange — kept for existing call sites */
  onClose?: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  /** @deprecated Accent is ignored — headers use neutral styling */
  accent?: "indigo" | "cyan" | "emerald" | "amber";
}) {
  function handleOpenChange(next: boolean) {
    onOpenChange?.(next);
    if (!next) onClose?.();
  }
  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          onInteractOutside={(e) => {
            const target = e.target as HTMLElement | null;
            if (
              target?.closest("[data-searchable-select-panel]") ||
              target?.closest("[data-customer-search-dropdown]") ||
              target?.closest("[data-recipient-picker-panel]")
            ) {
              e.preventDefault();
            }
          }}
          onPointerDownOutside={(e) => {
            const target = e.target as HTMLElement | null;
            if (
              target?.closest("[data-searchable-select-panel]") ||
              target?.closest("[data-customer-search-dropdown]") ||
              target?.closest("[data-recipient-picker-panel]")
            ) {
              e.preventDefault();
            }
          }}
          onFocusOutside={(e) => {
            const target = e.target as HTMLElement | null;
            if (
              target?.closest("[data-searchable-select-panel]") ||
              target?.closest("[data-customer-search-dropdown]") ||
              target?.closest("[data-recipient-picker-panel]")
            ) {
              e.preventDefault();
            }
          }}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 flex max-h-[min(90vh,820px)] w-[calc(100%-1.5rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-card shadow-xl outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            sizes[size],
            className,
          )}
        >
          {(title || description) ? (
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                {title ? (
                  <Dialog.Title className="text-[15px] font-semibold tracking-tight text-foreground">
                    {title}
                  </Dialog.Title>
                ) : null}
                {description ? (
                  <Dialog.Description className="mt-0.5 text-xs text-muted-foreground">
                    {description}
                  </Dialog.Description>
                ) : null}
              </div>
              <Dialog.Close className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>
          ) : null}
          <div
            className={cn(
              "min-h-0 flex-1 overflow-y-auto bg-card",
              title || description ? "crm-card-padding" : "crm-card-padding",
            )}
          >
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
