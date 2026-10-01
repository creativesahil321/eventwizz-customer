"use client";

import React, { useState } from "react";
import {
  QueryClient,
  QueryClientProvider as TanstackQueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { isAxiosError } from "axios";
import { useSharedQueryClient } from "./QueryClientContext";
import { setActiveQueryClient } from "./active-query-client";
import { env } from "@/env";

const MAX_QUERY_RETRIES = 2;

/**
 * Don't retry client errors (4xx) — they won't succeed on retry and each
 * attempt re-triggers the global error toast. Retry other failures
 * (network, timeout, 5xx) up to MAX_QUERY_RETRIES times.
 */
function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (typeof status === "number" && status >= 400 && status < 500) {
      return false;
    }
  }
  return failureCount < MAX_QUERY_RETRIES;
}

// RootQueryProvider now includes devtools by default
export function RootQueryProvider({ children }: { children: React.ReactNode }) {
  // Create a new QueryClient directly instead of using useSharedQueryClient
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 10, // 10 minutes
            retry: shouldRetryQuery,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
          },
          mutations: {
            retry: false, // Don't retry mutations - failures should be handled explicitly
            onError: (error) => {
              console.error("Mutation error:", error);
            },
          },
        },
      }),
  );

  // Expose the live client to non-React code (e.g. auth store logout).
  // Browser only — a module-level value must not be shared across SSR requests.
  if (typeof window !== "undefined") {
    setActiveQueryClient(queryClient);
  }

  const isDev = env.NEXT_PUBLIC_DEV_MODE;

  return (
    <TanstackQueryClientProvider client={queryClient}>
      {children}
      {isDev && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position="left"
          styleNonce="chat-bot-compatible"
        />
      )}
    </TanstackQueryClientProvider>
  );
}

// Keep this for backward compatibility, but it's no longer needed in most cases
export default function QueryProvider({
  children,
  enableDevtools = false,
}: {
  children: React.ReactNode;
  enableDevtools?: boolean;
}) {
  console.warn(
    "Using nested QueryProvider is deprecated. Use RootQueryProvider at the app root instead.",
  );

  const queryClient = useSharedQueryClient();
  const isDev = env.NEXT_PUBLIC_DEV_MODE;

  return (
    <TanstackQueryClientProvider client={queryClient}>
      {children}
      {isDev && enableDevtools && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position="left"
          styleNonce="chat-bot-compatible"
        />
      )}
    </TanstackQueryClientProvider>
  );
}
