import type { QueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { isAdmin } from "@/lib/roles";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import {
  CUSTOMERS_DIRECTORY_STALE_MS,
  LIST_STALE_MS,
  REPORTS_STALE_MS,
  TEAM_FEED_STALE_MS,
} from "@/lib/query-stale";

const customerDirectoryParams = {
  q: undefined,
  status: undefined,
  assignedEmployeeId: undefined,
  page: 1,
  limit: DEFAULT_PAGE_SIZE,
};

export async function prefetchAfterAuth(
  queryClient: QueryClient,
  role?: string,
) {
  const tasks: Promise<unknown>[] = [
    queryClient.prefetchQuery({
      queryKey: ["crm-insights"],
      queryFn: async () => (await api.get("/reports/crm-insights")).data,
      staleTime: REPORTS_STALE_MS,
    }),
    queryClient.prefetchQuery({
      queryKey: ["reports-dashboard"],
      queryFn: async () => (await api.get("/reports/dashboard")).data,
      staleTime: REPORTS_STALE_MS,
    }),
    queryClient.prefetchQuery({
      queryKey: ["customers-directory", customerDirectoryParams],
      queryFn: async () =>
        import("@/lib/customers-directory").then((m) =>
          m.fetchCustomersDirectory(customerDirectoryParams),
        ),
      staleTime: CUSTOMERS_DIRECTORY_STALE_MS,
    }),
    queryClient.prefetchQuery({
      queryKey: ["team-updates-summary"],
      queryFn: async () => (await api.get("/team-updates/summary")).data,
      staleTime: TEAM_FEED_STALE_MS,
    }),
    queryClient.prefetchQuery({
      queryKey: ["leads-kanban"],
      queryFn: async () => (await api.get("/leads/kanban")).data,
      staleTime: LIST_STALE_MS,
    }),
  ];

  if (isAdmin(role)) {
    tasks.push(
      queryClient.prefetchQuery({
        queryKey: ["payments-summary"],
        queryFn: async () => (await api.get("/payments/summary")).data,
        staleTime: REPORTS_STALE_MS,
      }),
    );
  }

  await Promise.allSettled(tasks);
}
