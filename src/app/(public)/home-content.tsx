"use client";

import { useContext } from "react";
import { ServerContext } from "@/lib/server-context";
import AdminHomePage from "./admin/page";
import VendorSiteHomePage from "./vendor/page";

/**
 * Client component that determines which homepage to render
 * Uses server-side data passed through ServerContext
 */
export function HomeContent() {
  // Get server data from context
  const { subdomain, theme } = useContext(ServerContext);

  // First try to detect by subdomain (fastest and most reliable)
  if (subdomain === "vendor") {
    return <VendorSiteHomePage />;
  }

  // If no subdomain match, check theme data
  if (theme?.website_role === "vendor") {
    return <VendorSiteHomePage />;
  }

  // Default to admin homepage
  return (
    <main className="min-h-screen bg-[color:var(--color-background)] text-[color:var(--color-text)]">
      <AdminHomePage />
    </main>
  );
}
