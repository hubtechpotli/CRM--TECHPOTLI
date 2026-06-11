import { isAxiosError } from "axios";

export function getRateLimitMessage(error: unknown): string | null {
  if (!isAxiosError(error) || error.response?.status !== 429) return null;
  const retryAfter = error.response.headers["retry-after"];
  if (retryAfter) {
    const seconds = parseInt(String(retryAfter), 10);
    if (!Number.isNaN(seconds) && seconds > 0) {
      return `Too many sign-in attempts. Please wait ${seconds} seconds and try again.`;
    }
  }
  return "Too many sign-in attempts. Please wait a minute and try again.";
}

export function getApiErrorMessage(error: unknown, fallback = "Request failed"): string {
  const rateLimit = getRateLimitMessage(error);
  if (rateLimit) return rateLimit;

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
