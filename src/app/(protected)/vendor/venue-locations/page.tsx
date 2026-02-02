"use client";

import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import VenueLocationsDataTable from "./_components/locations-data-table";
import dynamic from "next/dynamic";
import { Shell } from "@/components/shell";
import { useLocations } from "./_lib/queries";
import { SearchParams } from "./_lib/types";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/data-table/use-debounce";
import { useQueryState, parseAsInteger } from "nuqs";

// Dynamic import of the location create dialog
const CreateLocationDialog = dynamic(
  () => import("./_components/_location-create"),
  {
    ssr: false,
  },
);

// Simple wrapper component for the dialog.
function CreateLocationButton() {
  return <CreateLocationDialog />;
}

export default function VenueLocationsPage() {
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  // Debounce search (same as booking history / customers)
  const debouncedSearch = useDebounce(globalFilterValue, 500);

  // Reset page to 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, setPage]);

  const searchParams: SearchParams = {
    page: "1",
    per_page: "30",
    search: debouncedSearch,
  };

  const { isLoading, isFetching } = useLocations(searchParams, {
    enabled: true,
  });

  return (
    <section className="page text-black min-w-0">
      <Shell className="gap-2">
        <div className="flex flex-col gap-4 min-w-0">
          <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6 mb-4 min-w-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center flex-wrap gap-4 min-w-0">
              <div className="min-w-0">
                <h1 className="text-2xl title-header font-bold">
                  Event Locations
                </h1>
                <p className="text-muted-foreground mt-2">
                  Manage different locations for your event. Each location
                  represents a physical address where your venue operates.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 items-center shrink-0">
                <div className="relative flex-1 sm:min-w-[240px]">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search locations..."
                    value={globalFilterValue}
                    onChange={(e) => setGlobalFilterValue(e.target.value)}
                    className="pl-8 w-full"
                    disabled={isFetching}
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CreateLocationButton />
                </div>
              </div>
            </div>
          </div>

          <VenueLocationsDataTable
            initialData={[]}
            search={searchParams}
            globalFilterValue={globalFilterValue}
            hideToolbar
            hideAddButton
          />
        </div>
      </Shell>
    </section>
  );
}
