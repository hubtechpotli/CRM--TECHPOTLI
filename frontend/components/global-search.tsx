"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

type SearchResults = {
  customers: { id: string; companyName: string; ownerName?: string }[];
  leads: { id: string; companyName: string; contactName?: string; status?: string }[];
  projects: { id: string; name: string; status?: string }[];
  invoices: { id: string; invoiceNumber: string; status?: string }[];
  users: { id: string; name: string; email: string }[];
  semantic?: { type: string; id: string; label: string; score: number }[];
};

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(null);
      abortRef.current?.abort();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const q = debouncedQuery.trim();
    if (!q) {
      setResults(null);
      setLoading(false);
      abortRef.current?.abort();
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    api
      .get<SearchResults>("/search", { params: { q }, signal: controller.signal })
      .then((res) => {
        if (!controller.signal.aborted) setResults(res.data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setResults(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [debouncedQuery, open]);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (!value.trim()) {
      setResults(null);
      setLoading(false);
    }
  }, []);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full max-w-md items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-4 py-2 text-sm text-muted-foreground transition hover:border-primary/30 hover:bg-card"
      >
        <Search className="h-3.5 w-3.5" />
        Search…
        <kbd className="rounded border border-border/60 px-1.5 py-0.5 text-[10px]">⌘K</kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[15vh] backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
        <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground">
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              value={query}
              onValueChange={handleQueryChange}
              placeholder="Search customers, leads, projects…"
              className="h-12 w-full bg-transparent text-sm outline-none"
              autoFocus
            />
          </div>
          <Command.List className="max-h-80 overflow-y-auto p-2">
            {loading ? (
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">Searching…</Command.Empty>
            ) : null}
            {!loading && query && results ? (
              <>
                {results.semantic && results.semantic.length > 0 ? (
                  <Command.Group heading="AI-powered matches">
                    {results.semantic.map((s) => (
                      <Command.Item
                        key={`semantic-${s.type}-${s.id}`}
                        value={`semantic-${s.type}-${s.id}`}
                        onSelect={() =>
                          navigate(s.type === "lead" ? `/leads/${s.id}` : `/customers/${s.id}`)
                        }
                        className="cursor-pointer rounded-lg px-3 py-2 text-sm aria-selected:bg-primary/10"
                      >
                        {s.label} · {s.type} ({Math.round(s.score * 100)}% match)
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null}
                {results.customers.length > 0 ? (
                  <Command.Group heading="Customers">
                    {results.customers.map((c) => (
                      <Command.Item
                        key={c.id}
                        value={`customer-${c.id}`}
                        onSelect={() => navigate(`/customers/${c.id}`)}
                        className="cursor-pointer rounded-lg px-3 py-2 text-sm aria-selected:bg-primary/10"
                      >
                        {c.companyName}
                        {c.ownerName ? ` · ${c.ownerName}` : ""}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null}
                {results.leads.length > 0 ? (
                  <Command.Group heading="Leads">
                    {results.leads.map((l) => (
                      <Command.Item
                        key={l.id}
                        value={`lead-${l.id}`}
                        onSelect={() => navigate(`/leads/${l.id}`)}
                        className="cursor-pointer rounded-lg px-3 py-2 text-sm aria-selected:bg-primary/10"
                      >
                        {l.companyName} · {l.status}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null}
                {results.projects.length > 0 ? (
                  <Command.Group heading="Projects">
                    {results.projects.map((p) => (
                      <Command.Item
                        key={p.id}
                        value={`project-${p.id}`}
                        onSelect={() => navigate("/projects")}
                        className="cursor-pointer rounded-lg px-3 py-2 text-sm aria-selected:bg-primary/10"
                      >
                        {p.name}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null}
                {results.invoices.length > 0 ? (
                  <Command.Group heading="Invoices">
                    {results.invoices.map((inv) => (
                      <Command.Item
                        key={inv.id}
                        value={`invoice-${inv.id}`}
                        onSelect={() => navigate("/invoices")}
                        className="cursor-pointer rounded-lg px-3 py-2 text-sm aria-selected:bg-primary/10"
                      >
                        {inv.invoiceNumber}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null}
                {!results.customers.length &&
                !results.leads.length &&
                !results.projects.length &&
                !results.invoices.length &&
                !(results.semantic?.length) ? (
                  <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                    No results found
                  </Command.Empty>
                ) : null}
              </>
            ) : null}
          </Command.List>
        </Command>
      </div>
      <button type="button" className="fixed inset-0 -z-10" aria-label="Close" onClick={() => setOpen(false)} />
    </div>
  );
}
