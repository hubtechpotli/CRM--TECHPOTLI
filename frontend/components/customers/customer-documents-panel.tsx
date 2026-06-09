"use client";

import { FormEvent, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { appendListItem, createTempId } from "@/lib/optimistic-mutation";
import { api } from "@/lib/api";
import { formatDate, formatLabel } from "@/lib/format";
import { DOCUMENT_TYPES } from "@/lib/types";
import { GlassCard } from "@/components/ui/glass-card";
import { Modal } from "@/components/ui/modal";
import { FormField, SelectInput, TextInput } from "@/components/ui/form-field";

type Document = Record<string, unknown>;

type UploadResult = { key: string; url: string; filename: string; size: number };

const emptyForm = {
  documentType: "PAN_CARD",
  customName: "",
};

export function CustomerDocumentsPanel({ customerId }: { customerId: string }) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["customer-documents", customerId],
    queryFn: async () => {
      const res = await api.get<Document[]>(`/customers/${customerId}/documents`);
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const openDocument = async (doc: Document) => {
    const key = String(doc.s3Key ?? "");
    if (!key) return;
    try {
      const res = await api.get<{ url: string }>("/uploads/signed-url", { params: { key } });
      window.open(res.data.url, "_blank", "noopener,noreferrer");
    } catch {
      alert("Could not open document. Try uploading again.");
    }
  };

  const docsKey = ["customer-documents", customerId] as const;

  const uploadMutation = useOptimisticMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("No file selected");
      const formData = new FormData();
      formData.append("file", selectedFile);
      const uploadRes = await api.post<UploadResult>("/uploads", formData);
      const { key, filename, size } = uploadRes.data;
      const res = await api.post(`/customers/${customerId}/documents`, {
        documentType: form.documentType,
        filename,
        s3Key: key,
        mimeType: selectedFile.type || "application/octet-stream",
        fileSizeBytes: size,
        customName: form.customName.trim() || undefined,
      });
      return res.data;
    },
    snapshotKeys: [docsKey],
    invalidateKeys: [docsKey, ["customer-timeline", customerId]],
    onMutate: () => {
      appendListItem(queryClient, docsKey, {
        id: createTempId(),
        documentType: form.documentType,
        filename: selectedFile?.name ?? "Uploading…",
        customName: form.customName.trim() || undefined,
      });
      setShowUpload(false);
      setForm(emptyForm);
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = "";
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowUpload(true)}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          + Upload document
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading documents…</p>
      ) : (
        <GlassCard className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Size</th>
                <th className="pb-2 pr-4">Uploaded</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={String(doc.id)} className="border-b border-border/40">
                  <td className="py-2 pr-4 font-medium">
                    <button
                      type="button"
                      onClick={() => openDocument(doc)}
                      className="text-left font-medium text-primary hover:underline"
                    >
                      {String(doc.customName ?? doc.filename ?? "—")}
                    </button>
                  </td>
                  <td className="py-2 pr-4">{formatLabel(String(doc.documentType ?? ""))}</td>
                  <td className="py-2 pr-4">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs">{formatLabel(String(doc.status ?? "PENDING"))}</span>
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {doc.fileSizeBytes ? `${Math.round(Number(doc.fileSizeBytes) / 1024)} KB` : "—"}
                  </td>
                  <td className="py-2 pr-4">{formatDate(doc.createdAt)}</td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => openDocument(doc)}
                      className="rounded-lg border border-border px-2 py-1 text-xs font-medium hover:bg-muted"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {!documents.length ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-muted-foreground">
                    No documents uploaded yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </GlassCard>
      )}

      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Upload document">
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            uploadMutation.mutate();
          }}
          className="space-y-4"
        >
          <FormField label="Document type">
            <SelectInput
              value={form.documentType}
              onChange={(v) => setForm((f) => ({ ...f, documentType: v }))}
              options={DOCUMENT_TYPES.map((t) => ({ value: t, label: formatLabel(t) }))}
            />
          </FormField>
          {form.documentType === "CUSTOM" ? (
            <FormField label="Custom name">
              <TextInput value={form.customName} onChange={(v) => setForm((f) => ({ ...f, customName: v }))} required placeholder="Document label" />
            </FormField>
          ) : (
            <FormField label="Display name (optional)">
              <TextInput value={form.customName} onChange={(v) => setForm((f) => ({ ...f, customName: v }))} placeholder="Override filename" />
            </FormField>
          )}
          <FormField label="File">
            <input
              ref={fileRef}
              type="file"
              required
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowUpload(false)} className="rounded-lg border border-border px-4 py-2 text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploadMutation.isPending || !selectedFile}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {uploadMutation.isPending ? "Uploading…" : "Upload"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
