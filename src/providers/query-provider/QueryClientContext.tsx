"use client";

import React, { createContext, useContext, useState } from "react";
import { QueryClient } from "@tanstack/react-query";

interface QueryClientContextType {
  queryClient: QueryClient;
}

const QueryClientContext = createContext<QueryClientContextType | null>(null);

export function useSharedQueryClient() {
  const context = useContext(QueryClientContext);
  if (!context) {
    console.warn(
      "useSharedQueryClient: No QueryClientProvider found. This may cause issues with nested QueryProviders. Consider updating your code to use only the RootQueryProvider.",
    );

    // Create a fallback client instead of throwing an error
    // This helps with backward compatibility
    return new QueryClient({
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
        },
      },
    });
  }
  return context.queryClient;
}

export function QueryClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
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

  return (
    <QueryClientContext.Provider value={{ queryClient }}>
      {children}
    </QueryClientContext.Provider>
  );
}
