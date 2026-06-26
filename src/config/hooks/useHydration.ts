"use client";

import { useEffect, useState } from "react";

/**
 * Custom hook to handle hydration state
 * Prevents hydration mismatches between server and client rendering
 *
 * @returns boolean indicating if the component has been hydrated client-side
 */
export function useHydration() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated;
}
