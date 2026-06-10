import { isAxiosError } from "axios";

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;

  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (!error.response) return true;
    if (status === 401 || status === 403 || status === 503) return true;
  }

  return false;
}

export function queryRetryDelay(attemptIndex: number): number {
  return attemptIndex === 0 ? 300 : 800;
}
