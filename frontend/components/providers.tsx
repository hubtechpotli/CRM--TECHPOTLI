"use client";

import { QueryClient, QueryClientProvider, keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";
import { queryRetryDelay, shouldRetryQuery } from "@/lib/query-retry";
import { SocketProvider } from "@/lib/socket-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            placeholderData: keepPreviousData,
            retry: shouldRetryQuery,
            retryDelay: queryRetryDelay,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </SocketProvider>
    </QueryClientProvider>
  );
}
