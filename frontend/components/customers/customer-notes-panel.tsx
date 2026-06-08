"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { GlassCard } from "@/components/ui/glass-card";
import { Modal } from "@/components/ui/modal";
import { FormField, TextArea } from "@/components/ui/form-field";

type InternalNote = Record<string, unknown> & {
  author?: { name?: string };
};

function mutationError(err: unknown) {
  return isAxiosError(err)
    ? String((err.response?.data as { message?: string })?.message ?? "Failed to save note")
    : "Failed to save note";
}

export function CustomerQuickNotes({ customerId }: { customerId: string }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["customer-internal-notes", customerId],
    queryFn: async () => {
      const res = await api.get<InternalNote[]>(`/customers/${customerId}/internal-notes`);
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/customers/${customerId}/internal-notes`, { content: content.trim() });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-internal-notes", customerId] });
      queryClient.invalidateQueries({ queryKey: ["customer-timeline", customerId] });
      setShowAdd(false);
      setContent("");
      setError(null);
    },
    onError: (err) => setError(mutationError(err)),
  });

  return (
    <div className="border-t border-border/50 pt-6">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Quick notes</h3>
          <p className="text-xs text-muted-foreground">Short notes visible to the whole team.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAdd(true);
            setError(null);
          }}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/50"
        >
          + Add note
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading notes…</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <GlassCard key={String(note.id)}>
              <div className="flex flex-wrap items-start justify-between gap-2 text-xs text-muted-foreground">
                <span>{note.author?.name ?? "Team"}</span>
                <span>{formatDateTime(note.createdAt)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{String(note.content)}</p>
            </GlassCard>
          ))}
          {!notes.length ? <p className="text-sm text-muted-foreground">No quick notes yet.</p> : null}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add team note">
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            setError(null);
            createMutation.mutate();
          }}
          className="space-y-4"
        >
          <FormField label="Note">
            <TextArea value={content} onChange={setContent} required rows={5} placeholder="Team note…" />
          </FormField>
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {createMutation.isPending ? "Saving…" : "Save note"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
