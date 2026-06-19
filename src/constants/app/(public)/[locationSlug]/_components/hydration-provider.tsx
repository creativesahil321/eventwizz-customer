"use client";

import { ReactNode } from "react";
import { HydrationBoundary, type DehydratedState } from "@tanstack/react-query";

/**
 * A wrapper component for TanStack Query's HydrationBoundary (formerly Hydrate)
 * Used to hydrate the server-prefetched queries on the client
 */
export function Hydrate({
  children,
  state,
}: {
  children: ReactNode;
  state: DehydratedState;
}) {
  return <HydrationBoundary state={state}>{children}</HydrationBoundary>;
}
