"use client";

import { useEffect, useLayoutEffect, useState, type RefObject, type ReactNode } from "react";
import { createPortal } from "react-dom";
import * as DismissableLayer from "@radix-ui/react-dismissable-layer";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const MIN_PANEL_WIDTH = 320;
export const MAX_PANEL_HEIGHT = 320;
export const FLIP_THRESHOLD = 240;
export const PANEL_Z_INDEX = 9999;

export type SearchPanelKind = "customer" | "searchable" | "recipient";

export type FloatingPanelStyle = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  flipUp: boolean;
};

export function computeFloatingPanelStyle(anchor: DOMRect): FloatingPanelStyle {
  const width = Math.max(anchor.width, MIN_PANEL_WIDTH);
  const maxPanelHeight = Math.min(window.innerHeight * 0.5, MAX_PANEL_HEIGHT);
  const spaceBelow = window.innerHeight - anchor.bottom - 8;
  const spaceAbove = anchor.top - 8;
  const flipUp = spaceBelow < FLIP_THRESHOLD && spaceAbove > spaceBelow;

  let left = anchor.left;
  if (left + width > window.innerWidth - 8) {
    left = Math.max(8, window.innerWidth - width - 8);
  }

  const availableHeight = flipUp ? spaceAbove : spaceBelow;
  const maxHeight = Math.max(120, Math.min(maxPanelHeight, availableHeight));
  const top = flipUp ? anchor.top - 4 : anchor.bottom + 4;

  return { top, left, width, maxHeight, flipUp };
}

export function useFloatingPanel(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  deps: unknown[] = [],
) {
  const [style, setStyle] = useState<FloatingPanelStyle | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setStyle(null);
      return;
    }

    function update() {
      if (!anchorRef.current) return;
      setStyle(computeFloatingPanelStyle(anchorRef.current.getBoundingClientRect()));
    }

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, anchorRef, ...deps]);

  return { style, mounted };
}

export function isInsideSearchPanel(target: Node | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest("[data-customer-search-dropdown]") ||
      target.closest("[data-searchable-select-panel]") ||
      target.closest("[data-recipient-picker-panel]"),
  );
}

export function SearchOptionRow({
  label,
  sublabel,
  selected,
  highlighted,
  onSelect,
  onMouseEnter,
}: {
  label: string;
  sublabel?: string;
  selected?: boolean;
  highlighted?: boolean;
  onSelect: () => void;
  onMouseEnter?: () => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect();
      }}
      onMouseEnter={onMouseEnter}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition",
        highlighted ? "bg-primary/10" : "hover:bg-muted",
        selected && "bg-primary/5 text-primary",
      )}
    >
      <span className="min-w-0">
        <span className="block truncate font-medium">{label}</span>
        {sublabel ? (
          <span className="block truncate text-xs text-muted-foreground">{sublabel}</span>
        ) : null}
      </span>
      {selected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
    </button>
  );
}

export function SelectedSearchValue({
  label,
  sublabel,
  onClear,
  className,
}: {
  label: string;
  sublabel?: string;
  onClear?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2",
        className,
      )}
    >
      <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{label}</p>
        {sublabel ? (
          <p className="truncate text-xs text-muted-foreground">{sublabel}</p>
        ) : (
          <p className="text-xs text-primary/80">Selected</p>
        )}
      </div>
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Change
        </button>
      ) : null}
    </div>
  );
}

const PANEL_KIND_ATTR: Record<SearchPanelKind, string> = {
  customer: "data-customer-search-dropdown",
  searchable: "data-searchable-select-panel",
  recipient: "data-recipient-picker-panel",
};

export function SearchDropdownPanel({
  open,
  anchorRef,
  kind,
  className,
  children,
  footer,
  header,
  deps = [],
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  kind: SearchPanelKind;
  className?: string;
  children: ReactNode;
  footer?: ReactNode;
  header?: ReactNode;
  deps?: unknown[];
}) {
  const { style, mounted } = useFloatingPanel(open, anchorRef, deps);
  const attrName = PANEL_KIND_ATTR[kind];

  if (!open || !mounted || !style) return null;

  const panel = (
    <DismissableLayer.Branch
      className="pointer-events-auto"
      style={{
        position: "fixed",
        top: style.top,
        left: style.left,
        width: style.width,
        maxHeight: style.maxHeight,
        zIndex: PANEL_Z_INDEX,
        transform: style.flipUp ? "translateY(-100%)" : undefined,
        pointerEvents: "auto",
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        {...{ [attrName]: true }}
        className={cn(
          "flex h-full max-h-[inherit] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl",
          className,
        )}
      >
        {header ? <div className="shrink-0 border-b border-border">{header}</div> : null}
        <div className="min-h-0 flex-1 overflow-y-auto p-1">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-border/60 px-3 py-2 text-xs text-muted-foreground">
            {footer}
          </div>
        ) : null}
      </div>
    </DismissableLayer.Branch>
  );

  return createPortal(panel, document.body);
}
