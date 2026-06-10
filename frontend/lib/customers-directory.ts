import { api } from "@/lib/api";

export type DirectoryResponse<T = Record<string, unknown>> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export async function fetchCustomersDirectory<T = Record<string, unknown>>(
  params?: Record<string, string | number | undefined>,
) {
  const clean: Record<string, string | number> = {};
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        clean[key] = value;
      }
    }
  }
  const res = await api.get<DirectoryResponse<T>>("/customers/directory", { params: clean });
  return res.data;
}
