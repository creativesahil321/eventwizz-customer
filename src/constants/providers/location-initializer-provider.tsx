"use client";

import { ReactNode } from "react";

interface LocationInitializerProviderProps {
  children: ReactNode;
}

/**
 * LocationInitializerProvider - Simplified provider that doesn't need to do anything
 * Location fetching is handled by useLocations() hook in location-initializer component
 * Location state is managed by React Query cache and NextAuth session
 */
export function LocationInitializerProvider({
  children,
}: Readonly<LocationInitializerProviderProps>) {
  return <>{children}</>;
}
