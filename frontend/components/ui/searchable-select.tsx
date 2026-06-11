"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isInsideSearchPanel,
  SearchDropdownPanel,
  SearchOptionRow,
} from "@/components/ui/search-dropdown-panel";

export type SearchableOption = { value: string; label: string; sublabel?: string };

function resolveSelected(
  value: string,
  options: SearchableOption[],
  selectedOption?: SearchableOption | null,
  picked?: SearchableOption | null,
) {
  if (!value) return undefined;
  return (
    options.find((o) => o.value === value) ??
    (selectedOption?.value === value ? selectedOption : undefined) ??
    (picked?.value === value ? picked : undefined)
  );
}

export function SearchableSelect({
  value,
  onChange,
  options,
  onSearchChange,
  onOptionSelect,
  selectedOption,
  loading,
  placeholder = "Search…",
  emptyLabel = "No results found",
  searchHint,
  minSearchLength = 0,
  disabled,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  onSearchChange?: (query: string) => void;
  onOptionSelect?: (opt: SearchableOption) => void;
  selectedOption?: SearchableOption | null;
  loading?: boolean;
  placeholder?: string;
  emptyLabel?: string;
  searchHint?: string;
  minSearchLength?: number;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<SearchableOption | null>(null);

  const selected = resolveSelected(value, options, selectedOption, picked);
  const needsMoreChars =
    minSearchLength > 0 && query.trim().length > 0 && query.trim().length < minSearchLength;
  const showDropdown = open && !disabled;

  useEffect(() => {
    if (!value) setPicked(null);
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

  function handleQuery(next: string) {
    setQuery(next);
    onSearchChange?.(next);
    if (!open) setOpen(true);
  }

  function clearSelection() {
    setPicked(null);
    onChange("");
    setQuery("");
    onSearchChange?.("");
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function selectOption(opt: SearchableOption) {
    setPicked(opt);
    setOpen(false);
    setQuery("");
    if (onOptionSelect) {
      onOptionSelect(opt);
    } else {
      onChange(opt.value);
    }
    queueMicrotask(() => onSearchChange?.(""));
  }

  function handleFocus() {
    if (disabled) return;
    setOpen(true);
    if (selected) {
      setQuery("");
    }
  }

  const inputValue = selected && !open ? selected.label : query;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 transition",
          selected && "border-primary/30 bg-primary/[0.02]",
          "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          disabled={disabled}
          value={inputValue}
          onChange={(e) => handleQuery(e.target.value)}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          autoComplete="off"
        />
        {selected ? (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={clearSelection}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Clear selection"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : query ? (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleQuery("")}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {loading && !selected ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      <SearchDropdownPanel
        open={showDropdown}
        anchorRef={rootRef}
        kind="searchable"
        deps={[query, options.length, loading]}
        footer={
          !needsMoreChars && options.length > 0
            ? `${options.length} result${options.length === 1 ? "" : "s"}`
            : undefined
        }
      >
        <ul role="listbox">
          {needsMoreChars ? (
            <li className="px-3 py-3 text-xs text-muted-foreground">
              Type at least {minSearchLength} characters to search
            </li>
          ) : options.length === 0 ? (
            <li className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Searching…
                </>
              ) : (
                (query.trim().length >= minSearchLength ? emptyLabel : searchHint) ?? emptyLabel
              )}
            </li>
          ) : (
            <>
              {options.map((opt) => (
                <li key={opt.value || opt.label}>
                  <SearchOptionRow
                    label={opt.label}
                    sublabel={opt.sublabel}
                    selected={value === opt.value}
                    onSelect={() => selectOption(opt)}
                  />
                </li>
              ))}
              {loading ? (
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
