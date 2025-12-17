"use client";

import { Shell } from "@/components/shell";
import React from "react";
import MenuChoicesDataTable from "./_components/menus-data-table";
import { useSearchParams } from "next/navigation";
import { searchParamsCache } from "./_lib/validations";
// import { MenuChoicesPageSkeleton } from "./_components/skeleton-loader";
import { PageLoader } from "@/components/ui/page-loader";

export default function Page() {
  // Get search params using client-side hook
  const searchParams = useSearchParams();

  // Parse search params into proper object
  const parsedParams = Object.fromEntries(searchParams.entries());
  const parsedSearch = searchParamsCache.parse(parsedParams);

  // Set defaults
  const menuSearch = {
    ...parsedSearch,
    page: String(parsedSearch.page || 1),
    per_page: String(parsedSearch.per_page || 10),
  };

  return (
    <section className="page">
      <Shell className="gap-2">
        <div className="flex flex-col gap-4">
          <React.Suspense
            fallback={
              <PageLoader fullScreen={false} text="Loading menu choices..." />
            }
          >
            <MenuChoicesDataTable initialData={[]} search={menuSearch} />
          </React.Suspense>
        </div>
      </Shell>
    </section>
  );
}
