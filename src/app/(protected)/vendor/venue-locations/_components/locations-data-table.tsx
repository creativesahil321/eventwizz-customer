"use client";

import React, { useMemo, useCallback, useState, useEffect } from "react";
import { DataTable } from "@/components/data-table/data-table";
import {
  useDataTable,
  DataTableFilterField,
} from "@/hooks/data-table/use-data-table";
import { getColumns } from "./columns";
import { DataTableToolbar } from "./data-table-toolbar";
import { TableToolbarActions } from "./table-toolbar-actions";
import { TableRow, TableCell } from "@/components/ui/table";
import { toSentenceCase } from "@/lib/utils";
import { LocationsTableSkeleton } from "./skeleton-loader";
import { useLocations, useToggleLocationStatus } from "../_lib/queries";
import { Location, LocationRowAction, SearchParams } from "../_lib/types";
import dynamic from "next/dynamic";
import { useQueryState, parseAsInteger } from "nuqs";

// Dynamically load dialogs to improve initial load performance
const CreateLocationDialog = dynamic(() => import("./_location-create"), {
  ssr: false,
});

const UpdateLocationDialog = dynamic(() => import("./_location-update"), {
  ssr: false,
});

const ViewLocationDialog = dynamic(() => import("./_location-view"), {
  ssr: false,
});

const SetDefaultLocationDialog = dynamic(
  () => import("./_location-set-default"),
  {
    ssr: false,
  },
);

// Status filters for locations
const statusFilters = [
  { id: 1, title: "All Locations", value: "all", count: 0 },
  { id: 2, title: "Default Locations", value: "default", count: 0 },
];

type LocationsDataTableProps = {
  initialData: Location[];
  search: SearchParams;
  globalFilterValue?: string;
  hideToolbar?: boolean;
  hideAddButton?: boolean;
};

function VenueLocationsDataTable({
  initialData,
  search,
  globalFilterValue = "",
  hideToolbar = false,
  hideAddButton = false,
}: LocationsDataTableProps) {
  const [rowAction, setRowAction] = useState<LocationRowAction | null>(null);
  const toggleStatusMutation = useToggleLocationStatus();

  // Read page and per_page from URL (same as booking history / customers)
  const [page] = useQueryState("page", parseAsInteger.withDefault(1));
  const [per_page] = useQueryState("per_page", parseAsInteger.withDefault(30));

  // Build query params: URL for pagination, search prop for filters
  const queryParams = useMemo(
    () => ({
      page: String(page ?? 1),
      per_page: String(per_page ?? 30),
      search: typeof search.search === "string" ? search.search : "",
    }),
    [page, per_page, search.search],
  );

  const shouldFetch = initialData.length === 0;
  const {
    data: locationsData,
    isError,
    error,
    isLoading,
  } = useLocations(queryParams, { enabled: shouldFetch });

  // Support both shapes: { data, meta } (from API) or array (legacy/cache)
  const locations = useMemo(() => {
    if (locationsData == null) return initialData || [];
    if (Array.isArray(locationsData)) return locationsData as Location[];
    const data = (locationsData as { data?: Location[] }).data;
    return Array.isArray(data) ? data : initialData || [];
  }, [locationsData, initialData]);

  const meta = useMemo(() => {
    if (
      locationsData != null &&
      !Array.isArray(locationsData) &&
      "meta" in locationsData
    ) {
      return (locationsData as { meta?: { last_page: number } }).meta;
    }
    return undefined;
  }, [locationsData]);

  const pageSize = per_page ?? 30;
  // Use API meta.last_page when available so server-side pagination works; otherwise client-side
  const pageCount = useMemo(
    () =>
      meta?.last_page != null
        ? meta.last_page
        : Math.max(1, Math.ceil(locations.length / pageSize)),
    [meta?.last_page, locations.length, pageSize],
  );

  const columns = useMemo(
    () =>
      getColumns({
        setRowAction,
        toggleStatusMutation,
      }),
    [setRowAction, toggleStatusMutation],
  );

  // Define filter fields for the table
  const filterFields = useMemo<DataTableFilterField<Location>[]>(
    () => [
      {
        id: "name",
        label: "Location Name",
        placeholder: "Location name",
      },
      {
        id: "city",
        label: "City",
        placeholder: "City name",
      },
      {
        id: "is_default" as keyof Location,
        label: "Status",
        type: "dropdown",
        options: statusFilters.map((option) => ({
          label: toSentenceCase(option.title),
          value: option.value,
          icon: undefined,
          count: option.count,
        })),
      },
    ],
    [],
  );

  const getRowId = useCallback(
    (originalRow: Location) => String(originalRow?.id || ""),
    [],
  );

  const { table } = useDataTable({
    data: locations,
    columns,
    pageCount,
    filterFields,
    enableAdvancedFilter: false,
    enableClientSideSorting: true,
    initialState: {
      sorting: [{ id: "created_at", desc: true }],
      columnPinning: { right: ["actions"] },
    },
    getRowId,
    shallow: false,
    clearOnDefault: true,
  });

  // Update global filter when globalFilterValue prop changes
  useEffect(() => {
    if (table) {
      table.setGlobalFilter(globalFilterValue);
    }
  }, [globalFilterValue, table]);

  // Handle errors
  if (isError) {
    return (
      <div className="text-red-500">
        Error loading locations: {error?.message || "Unknown error"}
      </div>
    );
  }

  // Show loading skeleton
  if (isLoading) {
    return <LocationsTableSkeleton className="animate-pulse" />;
  }

  return (
    <section className="w-full min-w-0 relative">
      <div className="w-full min-w-0 overflow-x-auto">
        <DataTable
          table={table}
          className="min-w-0"
          emptyStateRenderer={() => (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No locations found. Try adjusting your filters.
              </TableCell>
            </TableRow>
          )}
        >
          {!hideToolbar && (
            <DataTableToolbar
              className="bg-background p-6 mb-4 w-full min-w-0"
              table={table}
              title=""
            >
              <TableToolbarActions table={table} />
              {!hideAddButton && <CreateLocationDialog />}
            </DataTableToolbar>
          )}
          {hideToolbar && !hideAddButton && (
            <div className="p-4 flex justify-end">
              <CreateLocationDialog />
            </div>
          )}
        </DataTable>
      </div>

      {/* Action Dialogs */}
      {rowAction?.type === "update" && (
        <UpdateLocationDialog
          open
          onOpenChange={() => setRowAction(null)}
          location={rowAction?.row?.original}
        />
      )}

      {rowAction?.type === "view" && (
        <ViewLocationDialog
          open
          onOpenChange={() => setRowAction(null)}
          location={rowAction?.row?.original}
        />
      )}

      {rowAction?.type === "setDefault" && (
        <SetDefaultLocationDialog
          open
          onOpenChange={() => setRowAction(null)}
          location={rowAction?.row?.original}
        />
      )}
    </section>
  );
}

export default React.memo(VenueLocationsDataTable);
