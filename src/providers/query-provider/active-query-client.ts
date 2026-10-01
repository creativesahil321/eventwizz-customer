import type { QueryClient } from "@tanstack/react-query";

/**
 * Module-level handle to the QueryClient created by RootQueryProvider, so
 * non-React code (e.g. the auth store's logout) can clear the live cache
 * instead of an unrelated module singleton.
 */
let activeQueryClient: QueryClient | null = null;

export function setActiveQueryClient(client: QueryClient): void {
  activeQueryClient = client;
}

export function getActiveQueryClient(): QueryClient | null {
  return activeQueryClient;
}
