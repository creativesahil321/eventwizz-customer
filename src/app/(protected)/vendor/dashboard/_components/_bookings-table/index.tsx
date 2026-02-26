"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { getColumns } from "./columns";
import { Booking, SearchParams } from "../../_lib/types";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { DataTable } from "@/components/data-table/data-table";
import { useDataTable } from "@/hooks/data-table/use-data-table";
import { DataTableToolbar } from "./data-table-toolbar";

type DashboardBookingsTableProps = {
  initialData: Booking[];
  search: SearchParams;
};

export default function DashboardBookingsTable({
  initialData,
  search,
}: DashboardBookingsTableProps) {
  const router = useRouter();
  const onViewBooking = React.useCallback(
    (booking: Booking) => {
      router.push(`/vendor/booking-history/${booking.id}`);
    },
    [router]
  );
  const columns = React.useMemo(
    () => getColumns({ onViewBooking }),
    [onViewBooking],
  );

  const getRowId = React.useCallback((originalRow: Booking) => {
    return String(originalRow?.transaction_id ?? originalRow?.id ?? "");
  }, []);

  const bookingsHistory = initialData;

  const { table } = useDataTable({
    data: bookingsHistory,
    columns,
    pageCount: search.per_page ? Number(search.per_page) : 10,
    filterFields: [],
    enableAdvancedFilter: false,
    enableClientSideSorting: true,
    initialState: {
      sorting: [{ id: "total_amount", desc: true }],
      columnPinning: { right: ["actions"] },
    },
    getRowId,
    shallow: false,
    clearOnDefault: true,
  });

  const title = "Recent Bookings";

  return (
    <section className="w-full relative">
      {bookingsHistory.length === 0 ? (
        <DataTableSkeleton
          columnCount={6}
          cellWidths={["10rem", "40rem", "12rem", "12rem", "8rem", "8rem"]}
          shrinkZero
        />
      ) : (
        <>
          <DataTable table={table} showPagination={false} stickyHeader>
            <DataTableToolbar
              className="bg-background p-6 border rounded-lg"
              table={table}
              title={title}
            />
          </DataTable>
        </>
      )}
    </section>
  );
}
