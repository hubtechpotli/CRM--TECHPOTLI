"use client";

import { Download } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export function ExportButtons({ module }: { module: string }) {
  const token = useAuthStore((s) => s.accessToken);

  function download(format: "excel" | "pdf") {
    if (!token) return;
    const url = `${baseURL}/export/${module}/${format}`;
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", `${module}-export.${format === "excel" ? "xlsx" : "pdf"}`);
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        a.href = URL.createObjectURL(blob);
        a.click();
      });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => download("excel")}
        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
      >
        <Download className="h-3.5 w-3.5" />
        Export Excel
      </button>
      <button
        type="button"
        onClick={() => download("pdf")}
        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
      >
        <Download className="h-3.5 w-3.5" />
        Export PDF
      </button>
    </div>
  );
}
