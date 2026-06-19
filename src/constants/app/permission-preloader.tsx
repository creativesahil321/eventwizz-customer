"use client";

import { useEffect } from "react";
import { hydratePermissionsSync } from "@/store/permission.store";

/**
 * This script runs synchronously during initial page load
 * to ensure permissions are loaded as early as possible
 */
export default function PermissionPreloader() {
  // Immediately try to hydrate permissions on script load
  useEffect(() => {
    const runHydration = () => {
      // Run sync hydration from localStorage/sessionStorage
      hydratePermissionsSync();
    };

    // Try to run immediately
    runHydration();

    // Also run when the document is ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", runHydration);
      return () => {
        document.removeEventListener("DOMContentLoaded", runHydration);
      };
    }
  }, []);

  // This component doesn&apos;t render anything
  return null;
}
