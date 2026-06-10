"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { TextArea, TextInput } from "@/components/ui/form-field";
import { cn } from "@/lib/utils";

type UserNote = {
  id: string;
  title: string;
  body: string;
  isDraft: boolean;
  updatedAt: string;
};

export default function NotepadPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["notepad-notes"],
    queryFn: async () => {
      const res = await api.get<UserNote[]>("/notepad/notes");
      return res.data;
    },
  });

  const selected = notes.find((n) => n.id === selectedId) ?? notes[0] ?? null;

  useEffect(() => {
    if (!selectedId && notes[0]) setSelectedId(notes[0].id);
  }, [notes, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const note = notes.find((n) => n.id === selectedId);
    if (note) {
      setTitle(note.title);
      setBody(note.body);
    }
    // Only re-hydrate editor when switching notes — not on background saves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<UserNote>("/notepad/notes", { title: "Untitled" });
      return res.data;
    },
    onSuccess: (note) => {
      void queryClient.invalidateQueries({ queryKey: ["notepad-notes"] });
      setSelectedId(note.id);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { id: string; title: string; body: string }) => {
      const res = await api.patch<UserNote>(`/notepad/notes/${payload.id}`, {
        title: payload.title,
        body: payload.body,
        isDraft: !payload.body.trim(),
      });
      return res.data;
    },
    onMutate: () => setSaveState("saving"),
    onSuccess: (updated) => {
      setSaveState("saved");
      queryClient.setQueryData<UserNote[]>(["notepad-notes"], (prev) =>
        prev?.map((n) => (n.id === updated.id ? updated : n)) ?? prev,
      );
    },
    onError: () => setSaveState("error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notepad/notes/${id}`);
    },
    onSuccess: () => {
      setSelectedId(null);
      void queryClient.invalidateQueries({ queryKey: ["notepad-notes"] });
    },
  });

  function scheduleSave(nextTitle: string, nextBody: string) {
    if (!selectedId) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setSaveState("saving");
    timerRef.current = setTimeout(() => {
      saveMutation.mutate({ id: selectedId, title: nextTitle, body: nextBody });
    }, 500);
  }

  function handleTitleChange(v: string) {
    setTitle(v);
    scheduleSave(v, body);
  }

  function handleBodyChange(v: string) {
    setBody(v);
    scheduleSave(title, v);
  }

  function handleDelete() {
    if (!selectedId) return;
    if (!window.confirm("Delete this note?")) return;
    deleteMutation.mutate(selectedId);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notepad"
        description="Your personal notes — auto-saved as you type."
        action={
          <button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            New note
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <GlassCard className="max-h-[70vh] overflow-y-auto p-2">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : notes.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No notes yet. Create one to get started.</p>
          ) : (
            <ul className="space-y-1">
              {notes.map((note) => (
                <li key={note.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(note.id)}
                    className={cn(
                      "w-full rounded-lg px-3 py-2 text-left text-sm transition",
                      selectedId === note.id ? "bg-primary/10 text-primary" : "hover:bg-muted",
                    )}
                  >
                    <p className="truncate font-medium">{note.title || "Untitled"}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {new Date(note.updatedAt).toLocaleString()}
                      {note.isDraft ? " · Draft" : ""}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard className="p-4">
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {saveState === "saving"
                    ? "Saving…"
                    : saveState === "saved"
                      ? "Saved"
                      : saveState === "error"
                        ? "Save failed — keep typing to retry"
                        : "Auto-save enabled"}
                </p>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2 py-1 text-xs text-red-600 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
              <TextInput value={title} onChange={handleTitleChange} placeholder="Note title" />
              <TextArea
                value={body}
                onChange={handleBodyChange}
                placeholder="Write your notes here…"
                rows={14}
              />
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Select a note or create a new one.
            </p>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
