"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronsUpDown, Loader2, Search } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  isInsideSearchPanel,
  SearchDropdownPanel,
  SearchOptionRow,
} from "@/components/ui/search-dropdown-panel";

export type RecipientType = "lead" | "customer";

export type Recipient = {
  id: string;
  companyName: string;
  contactName?: string;
  ownerName?: string;
  email?: string | null;
  status?: string;
};

function recipientLabel(r: Recipient, type: RecipientType) {
  const person = type === "lead" ? r.contactName : r.ownerName;
  const email = r.email ? ` · ${r.email}` : " · no email";
  return `${r.companyName}${person ? ` — ${person}` : ""}${email}`;
}

function recipientSublabel(r: Recipient, type: RecipientType) {
  const person = (type === "lead" ? r.contactName : r.ownerName) || "—";
  const email = r.email ? ` · ${r.email}` : " · No email";
  const status = r.status ? ` · ${r.status}` : "";
  return `${person}${email}${status}`;
}

function matchesQuery(r: Recipient, type: RecipientType, q: string) {
  const hay = [
    r.companyName,
    type === "lead" ? r.contactName : r.ownerName,
    r.email,
    r.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

export function RecipientPicker({
  type,
  value,
  onChange,
}: {
  type: RecipientType;
  value: Recipient | null;
  onChange: (recipient: Recipient | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setQuery("");
    setDebouncedQuery("");
    setOpen(false);
    onChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const { data: allRecipients = [], isLoading: loadingAll } = useQuery({
    queryKey: ["email-recipients-all", type],
    queryFn: async () => {
      const res = await api.get<Recipient[]>("/email/recipients", { params: { type, limit: 50 } });
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: 120_000,
  });

  const { data: serverResults = [], isFetching: searching } = useQuery({
    queryKey: ["email-recipients-search", type, debouncedQuery],
    queryFn: async () => {
      const res = await api.get<Recipient[]>("/email/recipients", {
        params: { type, q: debouncedQuery },
      });
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

  const displayed = useMemo(() => {
    if (debouncedQuery.length >= 2) return serverResults;
    if (!query.trim()) return allRecipients;
    return allRecipients.filter((r) => matchesQuery(r, type, query));
  }, [allRecipients, serverResults, debouncedQuery, query, type]);

  useEffect(() => {
    setHighlight(0);
  }, [displayed, query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (isInsideSearchPanel(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const isLoading = loadingAll || (debouncedQuery.length >= 2 && searching);

  function selectRecipient(r: Recipient) {
    onChange(r);
    setOpen(false);
    setQuery("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(0, displayed.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && displayed[highlight]) {
      e.preventDefault();
      selectRecipient(displayed[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const panelHeader = (
    <div className="flex items-center gap-2 px-3">
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={`Type to search ${type}s instantly…`}
        className="h-11 w-full bg-transparent text-sm outline-none"
        autoFocus
      />
      {isLoading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" /> : null}
    </div>
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={cn(
          "flex w-full items-center justify-between rounded-lg border border-border bg-white/50 px-3 py-2.5 text-left text-sm outline-none transition hover:bg-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-slate-900/50",
          !value && "text-muted-foreground",
        )}
      >
        <span className="truncate">
          {value ? recipientLabel(value, type) : `Search and select ${type}…`}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>

      <SearchDropdownPanel
        open={open}
        anchorRef={containerRef}
        kind="recipient"
        header={panelHeader}
        deps={[query, displayed.length, isLoading, highlight]}
        footer={
          displayed.length > 0
            ? `${displayed.length} result${displayed.length === 1 ? "" : "s"}${debouncedQuery.length >= 2 ? " · server search" : " · instant filter"}`
            : undefined
        }
      >
        <ul role="listbox">
          {!isLoading && displayed.length === 0 ? (
            <li className="py-6 text-center text-sm text-muted-foreground">
              {query.trim() ? `No ${type}s match "${query}"` : `No ${type}s found`}
            </li>
          ) : null}
          {displayed.map((r, idx) => (
            <li key={r.id} role="option" aria-selected={value?.id === r.id}>
              <SearchOptionRow
                label={r.companyName}
                sublabel={recipientSublabel(r, type)}
                selected={value?.id === r.id}
                highlighted={highlight === idx}
                onMouseEnter={() => setHighlight(idx)}
                onSelect={() => selectRecipient(r)}
              />
            </li>
          ))}
        </ul>
      </SearchDropdownPanel>
    </div>
  );
}
