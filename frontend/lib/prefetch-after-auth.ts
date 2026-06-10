import type { QueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { isAdmin } from "@/lib/roles";

export async function prefetchAfterAuth(
  queryClient: QueryClient,
  role?: string,
) {
  const tasks: Promise<unknown>[] = [
    queryClient.prefetchQuery({
      queryKey: ["crm-insights"],
      queryFn: async () => (await api.get("/reports/crm-insights")).data,
      staleTime: 60_000,
    }),
    queryClient.prefetchQuery({
      queryKey: ["customers-directory", { page: 1, limit: 50 }],
      queryFn: async () =>
        import("@/lib/customers-directory").then((m) =>
          m.fetchCustomersDirectory({ page: 1, limit: 50 }),
        ),
      staleTime: 60_000,
    }),
  ];

  if (isAdmin(role)) {
    tasks.push(
      queryClient.prefetchQuery({
        queryKey: ["payments-summary"],
        queryFn: async () => (await api.get("/payments/summary")).data,
        staleTime: 60_000,
      }),
    );
  }

  await Promise.allSettled(tasks);
}
