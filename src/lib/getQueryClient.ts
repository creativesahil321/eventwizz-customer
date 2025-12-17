import { QueryClient } from "@tanstack/react-query";
import { cache } from "react";

// Create a new query client instance and cache it using React's cache function
// This ensures we're using the same query client for the entire request in a React Server Component
export const getQueryClient = cache(
  () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          // Don't retry failed queries by default
          retry: false,
          // Default stale time of 30 seconds
          staleTime: 30 * 1000,
        },
      },
    })
);
