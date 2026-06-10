"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  customerToOption,
  useCustomerDirectorySearch,
} from "@/hooks/use-customer-directory-search";

export type CustomerOption = { value: string; label: string; sublabel?: string };

export function CustomerSearchField({
  value,
  selectedOption,
  onSelect,
  onClear,
  enabled = true,
  placeholder = "Search customer by name, phone, email…",
}: {
  value: string;
  selectedOption?: CustomerOption | null;
  onSelect: (opt: CustomerOption) => void;
  onClear: () => void;
  enabled?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [localPick, setLocalPick] = useState<CustomerOption | null>(null);

  const { data, isFetching, minChars } = useCustomerDirectorySearch(query, enabled);

  const resolved =
    selectedOption?.value === value
      ? selectedOption
      : localPick?.value === value
        ? localPick
        : null;

  const options = useMemo(() => {
    const items = data?.items ?? [];
    return items.map(customerToOption);
  }, [data?.items]);

  const trimmed = query.trim();
  const isTyping = trimmed.length > 0;
  const needsMore = isTyping && trimmed.length < minChars;
  const showDropdown = open && enabled && (isTyping || options.length > 0);

  useEffect(() => {
    if (!value) setLocalPick(null);
  }, [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const inputValue = focused || isTyping ? query : (resolved?.label ?? query);

  function handleInput(next: string) {
    if (resolved) {
      setLocalPick(null);
      onClear();
    }
    setQuery(next);
    setOpen(true);
  }

  function pick(opt: CustomerOption) {
    setLocalPick(opt);
    setQuery("");
    setFocused(false);
    setOpen(false);
    onSelect(opt);
  }

  function clearAll() {
    setLocalPick(null);
    setQuery("");
    setFocused(false);
    setOpen(false);
    onClear();
  }

  return (
    <div ref={rootRef} className="relative">
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 transition",
          "focus-within:border-foreground/25 focus-within:ring-2 focus-within:ring-foreground/5",
          resolved && "border-foreground/20 bg-muted/30",
        )}
      >
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <input
          id={id}
          type="text"
          value={inputValue}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => {
            setFocused(true);
            setOpen(true);
            if (resolved) setQuery("");
          }}
          onBlur={() => {
            window.setTimeout(() => setFocused(false), 120);
          }}
          placeholder={resolved && !focused ? resolved.label : placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          autoComplete="off"
          spellCheck={false}
        />
        {resolved || query ? (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={clearAll}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Clear"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {isFetching && isTyping ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {showDropdown ? (
        <div
          data-customer-search-dropdown
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-[60] overflow-hidden rounded-lg border border-border bg-card shadow-lg"
        >
          <ul className="max-h-52 overflow-y-auto p-1">
            {needsMore ? (
              <li className="px-3 py-2.5 text-xs text-muted-foreground">
                Type at least {minChars} characters to search
              </li>
            ) : options.length === 0 ? (
              <li className="flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground">
                {isFetching ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Searching…
                  </>
                ) : (
                  "No customers found — try a different search"
                )}
              </li>
            ) : (
              <>
                {options.map((opt) => (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(opt)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-muted",
                        value === opt.value && "bg-primary/5 text-primary",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{opt.label}</span>
                        {opt.sublabel ? (
                          <span className="block truncate text-[10px] text-muted-foreground">{opt.sublabel}</span>
                        ) : null}
                      </span>
                      {value === opt.value ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                    </button>
                  </li>
                ))}
                {isFetching ? (
                  <li className="flex items-center justify-center gap-1.5 border-t border-border/40 px-3 py-1.5 text-[10px] text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Updating…
                  </li>
                ) : null}
              </>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
