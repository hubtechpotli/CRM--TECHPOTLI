"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { api } from "@/lib/api";
import { Modal } from "@/components/ui/modal";

export function DocumentPreviewModal({
  open,
  onClose,
  title,
  s3Key,
  mimeType,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  s3Key: string;
  mimeType?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !s3Key) {
      setUrl(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setUrl(null);

    api
      .get<{ url: string }>("/uploads/signed-url", { params: { key: s3Key } })
      .then((res) => {
        if (!cancelled) setUrl(res.data.url);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load preview.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, s3Key]);

  const isImage = (mimeType ?? "").startsWith("image/");

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      <div className="relative min-h-[200px]">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading preview…
          </div>
        ) : null}
        {error ? <p className="py-8 text-center text-sm text-red-500">{error}</p> : null}
        {url && isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={title} className="mx-auto max-h-[70vh] rounded-lg border border-border" />
        ) : null}
        {url && !isImage ? (
          <iframe src={url} title={title} className="h-[70vh] w-full rounded-lg border border-border" />
        ) : null}
        {url ? (
          <div className="mt-4 flex justify-end gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              Open in new tab
            </a>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium"
            >
              <X className="h-3.5 w-3.5" />
              Close
            </button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
