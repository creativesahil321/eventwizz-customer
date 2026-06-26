"use client";

import { ThemeSchema } from "@/types/theme.types";
import { createContext } from "react";

/**
 * Context for server-side data that needs to be shared with client components
 * This avoids duplicate API calls by passing data from layout to pages
 */
export type ServerContextType = {
  // Server theme data fetched in the root layout
  theme: ThemeSchema | null;
  // Current host/domain from the request
  host: string | null;
  // Detected subdomain from the host
  subdomain: string | null;
};

/**
 * Create a context for server-side data
 */
export const ServerContext = createContext<ServerContextType>({
  theme: null,
  host: null,
  subdomain: null,
});

/**
 * Provider component to share server data with client components
 */
export function ServerContextProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: ServerContextType;
}) {
  return (
    <ServerContext.Provider value={value}>{children}</ServerContext.Provider>
  );
}
