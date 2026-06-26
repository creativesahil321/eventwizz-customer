"use client";

import React, { useState } from "react";
import {
  QueryClient,
  QueryClientProvider as TanstackQueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useSharedQueryClient } from "./QueryClientContext";
import { env } from "@/env";

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
            retry: 2,
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
