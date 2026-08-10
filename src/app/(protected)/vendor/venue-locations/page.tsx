"use client";

import React, { useState, useEffect } from "react";
import { Search, RotateCcw } from "lucide-react";
import VenueLocationsDataTable from "./_components/locations-data-table";
import dynamic from "next/dynamic";
import { Shell } from "@/components/shell";
import { useLocations } from "./_lib/queries";
import { SearchParams } from "./_lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/data-table/use-debounce";
import { useQueryState, parseAsInteger } from "nuqs";
import { PermissionRoute } from "@/components/permission";
import { AllLocationsBadge } from "@/components/location-indicator";

// Dynamic import of the location create dialog
const CreateLocationDialog = dynamic(
  () => import("./_components/_location-create"),
  {
    ssr: false,
  }
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

  const hasActiveFilters = !!debouncedSearch;

  const handleResetAllFilters = () => {
    setGlobalFilterValue("");
    setPage(1);
  };

  const searchParams: SearchParams = {
    page: "1",
    per_page: "30",
    search: debouncedSearch,
  };

  const { isFetching } = useLocations(searchParams, {
    enabled: true,
  });

  return (
    <PermissionRoute
      permissionKey="read-event-location"
      fallbackPath="/vendor/dashboard"
    >
      <section className="page text-black min-w-0 max-w-full overflow-x-hidden">
        <Shell className="gap-2 overflow-x-hidden">
        <div className="flex flex-col gap-4 min-w-0 max-w-full">
          <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-4 sm:p-6 mb-4 min-w-0 max-w-full overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center flex-wrap gap-4 min-w-0">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl title-header font-bold">
                    Event Locations
                  </h1>
                  <AllLocationsBadge />
                </div>
                <p className="text-muted-foreground mt-2">
                  All venues on your account. Each location is a physical
                  address where you run events — this list is not filtered by
                  the header selector.
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:shrink-0 min-w-0">
                <div className="relative w-full sm:w-auto sm:max-w-md min-w-0">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <Input
                    placeholder="Search locations..."
                    value={globalFilterValue}
                    onChange={(e) => setGlobalFilterValue(e.target.value)}
                    className="pl-8 w-full min-w-0"
                    disabled={isFetching}
                  />
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-initial">
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetAllFilters}
                      disabled={isFetching}
                      className="gap-2 shrink-0"
                      aria-label="Reset all filters"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset all
                    </Button>
                  )}
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
    </PermissionRoute>
  );
}
