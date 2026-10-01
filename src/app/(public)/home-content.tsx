"use client";

import VendorSiteHomePage from "./vendor/page";

/**
 * Vendor tenant homepage (client). The admin marketing home is server-rendered
 * directly in page.tsx, so this only handles the vendor storefront case.
 */
export function HomeContent() {
  return (
    <main className="min-h-screen bg-[color:var(--color-background)] text-[color:var(--color-text)]">
      <VendorSiteHomePage />
    </main>
  );
}
