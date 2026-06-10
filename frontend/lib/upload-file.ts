import { api } from "@/lib/api";

export type UploadResult = {
  key: string;
  filename: string;
  size?: number;
  mimeType?: string;
};

const MAX_WIDTH = 1920;
const JPEG_QUALITY = 0.8;

async function compressImageIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;

  try {
    const bitmap = await createImageBitmap(file);
    if (bitmap.width <= MAX_WIDTH && file.size < 800_000) {
      bitmap.close();
      return file;
    }
    const scale = Math.min(1, MAX_WIDTH / bitmap.width);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const outputType = file.type === "image/png" ? "image/webp" : file.type;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputType, JPEG_QUALITY),
    );
    if (!blob) return file;
    const ext = outputType === "image/webp" ? ".webp" : "";
    const name = file.name.replace(/\.[^.]+$/, "") + ext || file.name;
    return new File([blob], name, { type: outputType });
  } catch {
    return file;
  }
}

function putWithProgress(url: string, file: File, headers: Record<string, string>, onProgress?: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) {
        onProgress?.(50);
        return;
      }
      onProgress?.(Math.min(99, Math.round((e.loaded / e.total) * 100)));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(file);
  });
}

export async function uploadFileWithProgress(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  const prepared = await compressImageIfNeeded(file);
  onProgress?.(0);

  try {
    const presign = await api.post<{
      key: string;
      uploadUrl: string;
      method: string;
      headers: Record<string, string>;
      local?: boolean;
    }>("/uploads/presign", {
      filename: prepared.name,
      mimeType: prepared.type || "application/octet-stream",
      size: prepared.size,
    });

    const { key, uploadUrl, headers } = presign.data;
    const absoluteUrl = uploadUrl.startsWith("http")
      ? uploadUrl
      : `${typeof window !== "undefined" ? window.location.origin : ""}${uploadUrl.startsWith("/") ? "" : "/"}${uploadUrl}`;

    await putWithProgress(absoluteUrl, prepared, headers ?? { "Content-Type": prepared.type }, onProgress);

    const complete = await api.post<UploadResult>("/uploads/complete", {
      key,
      filename: prepared.name,
      mimeType: prepared.type,
      size: prepared.size,
    });

    onProgress?.(100);
    return {
      key: complete.data.key,
      filename: complete.data.filename ?? prepared.name,
      size: complete.data.size ?? prepared.size,
      mimeType: complete.data.mimeType ?? prepared.type,
    };
  } catch {
    const formData = new FormData();
    formData.append("file", prepared);

    const res = await api.post<UploadResult>("/uploads", formData, {
      onUploadProgress: (event) => {
        if (!event.total) {
          onProgress?.(50);
          return;
        }
        const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
        onProgress?.(percent);
      },
    });

    onProgress?.(100);
    return {
      key: res.data.key,
      filename: res.data.filename ?? prepared.name,
      size: res.data.size,
      mimeType: prepared.type || res.data.mimeType,
    };
  }
}
