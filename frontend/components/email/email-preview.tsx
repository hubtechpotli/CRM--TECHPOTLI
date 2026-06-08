"use client";

import { cn } from "@/lib/utils";

function wrapPreviewHtml(fragmentOrDoc: string) {
  const html = fragmentOrDoc?.trim() || "";
  const isDoc = /<!doctype|<html[\s>]/i.test(html);
  if (isDoc) return html;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { margin: 0; padding: 16px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #0f172a; }
      a { color: #9A7B2F; }
    </style>
  </head>
  <body>${html || "<p style='color:#94a3b8'>No content yet</p>"}</body>
</html>`;
}

export function EmailPreview({
  to,
  subject,
  bodyHtml,
  className,
}: {
  to?: string;
  subject?: string;
  bodyHtml: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col overflow-hidden rounded-xl border border-border bg-white dark:bg-slate-900", className)}>
      <div className="border-b border-border bg-muted/40 px-4 py-3">
        <div className="space-y-1 text-sm">
          <div className="flex gap-2">
            <span className="shrink-0 font-medium text-muted-foreground">To:</span>
            <span className="truncate text-foreground">{to || "—"}</span>
          </div>
          <div className="flex gap-2">
            <span className="shrink-0 font-medium text-muted-foreground">Subject:</span>
            <span className="truncate font-medium text-foreground">{subject || "—"}</span>
          </div>
        </div>
      </div>
      <iframe
        title="Email preview"
        // keep sandbox strict: no scripts, no same-origin access
        sandbox=""
        srcDoc={wrapPreviewHtml(bodyHtml)}
        className="min-h-[320px] w-full flex-1 border-0 bg-white"
      />
    </div>
  );
}
