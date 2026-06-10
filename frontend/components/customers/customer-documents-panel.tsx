"use client";

import { FormEvent, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { appendListItem, createTempId } from "@/lib/optimistic-mutation";
import { api } from "@/lib/api";
import { formatDate, formatLabel } from "@/lib/format";
import { uploadFileWithProgress } from "@/lib/upload-file";
import { DOCUMENT_TYPES } from "@/lib/types";
import { GlassCard } from "@/components/ui/glass-card";
import { Modal } from "@/components/ui/modal";
import { FormField, SelectInput, TextInput } from "@/components/ui/form-field";
import { SaveProgress, UploadProgress } from "@/components/ui/upload-progress";
import { DocumentPreviewModal } from "@/components/ui/document-preview-modal";

type Document = Record<string, unknown>;

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
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [saveStage, setSaveStage] = useState<"idle" | "uploading" | "saving" | "done">("idle");
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["customer-documents", customerId],
    queryFn: async () => {
      const res = await api.get<Document[]>(`/customers/${customerId}/documents`);
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const openDocument = (doc: Document) => {
    if (!String(doc.s3Key ?? "")) return;
    setPreviewDoc(doc);
  };

  const docsKey = ["customer-documents", customerId] as const;

  function resetModal() {
    setShowUpload(false);
    setForm(emptyForm);
    setSelectedFile(null);
    setUploadPercent(null);
    setSaveStage("idle");
    if (fileRef.current) fileRef.current.value = "";
  }

  const uploadMutation = useOptimisticMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("No file selected");

      setSaveStage("uploading");
      setUploadPercent(0);

      const uploaded = await uploadFileWithProgress(selectedFile, setUploadPercent);

      setSaveStage("saving");
      const res = await api.post(`/customers/${customerId}/documents`, {
        documentType: form.documentType,
        filename: uploaded.filename,
        s3Key: uploaded.key,
        mimeType: uploaded.mimeType ?? selectedFile.type ?? "application/octet-stream",
        fileSizeBytes: uploaded.size ?? selectedFile.size,
        customName: form.customName.trim() || undefined,
      });
      return res.data;
    },
    snapshotKeys: [docsKey],
    invalidateKeys: [docsKey, ["customer-timeline", customerId]],
    onMutate: () => {
      const tempId = createTempId();
      appendListItem(queryClient, docsKey, {
        id: tempId,
        documentType: form.documentType,
        filename: selectedFile?.name ?? "Uploading…",
        customName: form.customName.trim() || undefined,
        status: "PENDING",
      });
      return { tempId };
    },
    onSuccess: () => {
      setSaveStage("done");
      setTimeout(resetModal, 800);
    },
    onError: () => {
      setSaveStage("idle");
      setUploadPercent(null);
    },
  });

  const isBusy = uploadMutation.isPending || uploadPercent !== null;

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

      <Modal open={showUpload} onClose={resetModal} title="Upload document">
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
              disabled={isBusy}
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm disabled:opacity-60"
            />
            {selectedFile ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedFile.name} ({Math.max(1, Math.round(selectedFile.size / 1024))} KB)
              </p>
            ) : null}
          </FormField>

          {saveStage === "uploading" && uploadPercent !== null ? (
            <UploadProgress percent={uploadPercent} label="Uploading file to storage…" />
          ) : null}
          {saveStage === "saving" ? <SaveProgress stage="saving" /> : null}
          {saveStage === "done" ? <SaveProgress stage="done" /> : null}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={resetModal} disabled={isBusy} className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-60">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isBusy || !selectedFile}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {saveStage === "uploading"
                ? `Uploading ${uploadPercent ?? 0}%`
                : saveStage === "saving"
                  ? "Saving…"
                  : "Upload"}
            </button>
          </div>
        </form>
      </Modal>

      <DocumentPreviewModal
        open={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        title={String(previewDoc?.customName ?? previewDoc?.filename ?? "Document")}
        s3Key={String(previewDoc?.s3Key ?? "")}
        mimeType={String(previewDoc?.mimeType ?? "")}
      />
    </div>
  );
}
