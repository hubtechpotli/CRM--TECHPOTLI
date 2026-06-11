"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  customerToOption,
  useCustomerDirectorySearch,
} from "@/hooks/use-customer-directory-search";
import { getApiErrorMessage } from "@/lib/api-error";
import { isAxiosError } from "axios";
import {
  isInsideSearchPanel,
  SearchDropdownPanel,
  SearchOptionRow,
  SelectedSearchValue,
} from "@/components/ui/search-dropdown-panel";

export type CustomerOption = { value: string; label: string; sublabel?: string };

function resolveSelection(
  value: string,
  localPick: CustomerOption | null,
  selectedOption?: CustomerOption | null,
): CustomerOption | null {
  if (localPick && (!value || localPick.value === value)) return localPick;
  if (selectedOption && value && selectedOption.value === value) return selectedOption;
  return null;
}

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
  const prevValueRef = useRef(value);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [localPick, setLocalPick] = useState<CustomerOption | null>(null);

  const { data, isFetching, minChars, isError, error: searchError } = useCustomerDirectorySearch(query, enabled);

  const errorMessage = useMemo(() => {
    if (!isError || !searchError) return null;
    if (isAxiosError(searchError) && searchError.response?.status === 401) {
      return "Session expired — please refresh the page or sign in again";
    }
    return getApiErrorMessage(searchError, "Could not load customers — try again");
  }, [isError, searchError]);

  const resolved = useMemo(
    () => resolveSelection(value, localPick, selectedOption),
    [value, localPick, selectedOption],
  );

  const options = useMemo(() => {
    const items = data?.items ?? [];
    return items.map(customerToOption);
  }, [data?.items]);

  const trimmed = query.trim();
  const isTyping = trimmed.length > 0;
  const needsMore = isTyping && trimmed.length < minChars;
  const showDropdown =
    open && enabled && !resolved && (isTyping || options.length > 0 || !!errorMessage);

  useEffect(() => {
    if (prevValueRef.current && !value) {
      setLocalPick(null);
    }
    prevValueRef.current = value;
  }, [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (isInsideSearchPanel(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const editing = focused || isTyping;
  const inputValue = editing ? query : resolved?.label ?? "";

  function handleInput(next: string) {
    if (resolved) {
      setLocalPick(null);
      onClear();
    }
    setQuery(next);
    setOpen(true);
  }

  function pick(opt: CustomerOption) {
    onSelect(opt);
    setLocalPick(opt);
    setQuery("");
    setFocused(false);
    setOpen(false);
  }

  function clearAll() {
    setLocalPick(null);
    setQuery("");
    setFocused(false);
    setOpen(false);
    onClear();
  }

  return (
    <div ref={rootRef} className="relative space-y-2">
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 transition",
          "focus-within:border-foreground/25 focus-within:ring-2 focus-within:ring-foreground/5",
          resolved && "border-primary/30 bg-primary/[0.02]",
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
            if (resolved) {
              setQuery("");
            } else {
              setOpen(true);
            }
          }}
          onBlur={() => {
            window.setTimeout(() => setFocused(false), 120);
          }}
          placeholder={resolved && !editing ? resolved.label : placeholder}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground",
            resolved && !editing && "font-medium text-foreground",
          )}
          autoComplete="off"
          spellCheck={false}
        />
        {(resolved || query) && enabled ? (
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

      {resolved && !editing ? (
        <SelectedSearchValue
          label={resolved.label}
          sublabel={resolved.sublabel}
          onClear={enabled ? clearAll : undefined}
        />
      ) : null}

      <SearchDropdownPanel
        open={showDropdown}
        anchorRef={rootRef}
        kind="customer"
        deps={[query, options.length, isFetching, resolved?.value]}
        footer={
          !needsMore && options.length > 0
            ? `${options.length} result${options.length === 1 ? "" : "s"}`
            : undefined
        }
      >
        <ul role="listbox">
          {needsMore ? (
            <li className="px-3 py-3 text-xs text-muted-foreground">
              Type at least {minChars} characters to search
            </li>
          ) : errorMessage ? (
            <li className="px-3 py-3 text-xs text-red-600 dark:text-red-400">{errorMessage}</li>
          ) : options.length === 0 ? (
            <li className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
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
                  <SearchOptionRow
                    label={opt.label}
                    sublabel={opt.sublabel}
                    selected={value === opt.value}
                    onSelect={() => pick(opt)}
                  />
                </li>
              ))}
              {isFetching ? (
                <li className="flex items-center justify-center gap-1.5 border-t border-border/40 px-3 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Updating…
                </li>
              ) : null}
            </>
          )}
        </ul>
      </SearchDropdownPanel>
    </div>
  );
}
