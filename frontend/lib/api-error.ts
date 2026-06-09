import { isAxiosError } from "axios";

export function getApiErrorMessage(error: unknown, fallback = "Request failed"): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(", ") : data.message;
    }
    if (error.message === "Network Error") {
      return "Cannot reach the API server. Check Vercel env vars (API_PROXY_TARGET) and redeploy.";
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
