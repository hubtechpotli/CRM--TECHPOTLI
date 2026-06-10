import { api } from "@/lib/api";

export type UploadResult = {
  key: string;
  filename: string;
  size?: number;
  mimeType?: string;
};

export async function uploadFileWithProgress(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  onProgress?.(0);

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
    filename: res.data.filename ?? file.name,
    size: res.data.size,
    mimeType: file.type || res.data.mimeType,
  };
}
