"use client";

import { ReactNode } from "react";
import { HydrationBoundary, type DehydratedState } from "@tanstack/react-query";

export function Hydrate({
  children,
  state,
}: {
  children: ReactNode;
  state: DehydratedState;
}) {
  return <HydrationBoundary state={state}>{children}</HydrationBoundary>;
}
