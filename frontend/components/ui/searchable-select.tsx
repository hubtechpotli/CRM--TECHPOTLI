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

function resolveSelection(
  value: string,
  options: SearchableOption[],
  picked: SearchableOption | null,
  selectedOption?: SearchableOption | null,
): SearchableOption | undefined {
  if (picked && (!value || picked.value === value)) return picked;
  if (selectedOption && value && selectedOption.value === value) return selectedOption;
  if (value) return options.find((o) => o.value === value);
  return undefined;
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
  const prevValueRef = useRef(value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<SearchableOption | null>(null);

  const selected = resolveSelection(value, options, picked, selectedOption);
  const needsMoreChars =
    minSearchLength > 0 && query.trim().length > 0 && query.trim().length < minSearchLength;
  const showDropdown = open && !disabled;

  useEffect(() => {
    if (prevValueRef.current && !value) {
      setPicked(null);
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

  function handleQuery(next: string) {
    if (selected && next) {
      setPicked(null);
      onChange("");
      onSearchChange?.("");
    }
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
    if (onOptionSelect) {
      onOptionSelect(opt);
    } else {
      onChange(opt.value);
    }
    setPicked(opt);
    setOpen(false);
    setQuery("");
    queueMicrotask(() => onSearchChange?.(""));
  }

  function handleFocus() {
    if (disabled) return;
    setOpen(true);
    if (selected) {
      setQuery("");
    }
  }

  const isTyping = query.trim().length > 0;
  const inputValue = isTyping ? query : selected?.label ?? query;

  return (
    <div ref={rootRef} className={cn("relative space-y-2", className)}>
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
          className={cn(
            "min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground",
            selected && !isTyping && "font-medium text-foreground",
          )}
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

      {selected && !isTyping ? (
        <p className="text-xs text-primary/90">
          Selected: <span className="font-medium text-foreground">{selected.label}</span>
        </p>
      ) : null}

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
