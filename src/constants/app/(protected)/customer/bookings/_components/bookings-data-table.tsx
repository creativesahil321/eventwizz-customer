"use client";

import {
  useDataTable,
  DataTableFilterField,
} from "@/hooks/data-table/use-data-table";
import React, { useMemo, useCallback } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableRowAction, Booking, SearchParams } from "../_lib/types";
import { getBookingColumns } from "./columns";
import { DataTableToolbar } from "./data-table-toolbar";
import { toSentenceCase } from "@/lib/utils";
import { TableToolbarActions } from "./table-toolbar-actions";

const statusFilters = [
  { id: 1, title: "Successful Bookings", value: "successful", count: 0 },
  { id: 2, title: "Pending Bookings", value: "pending", count: 0 },
  { id: 3, title: "Refunded Bookings", value: "refunded", count: 0 },
  { id: 4, title: "Cancelled Bookings", value: "cancelled", count: 0 },
];

type BookingsDataTableProps = {
  readonly data: Booking[];
  readonly searchParams?: SearchParams;
};

function BookingsDataTable({ data, searchParams }: BookingsDataTableProps) {
  const [, setRowAction] = React.useState<DataTableRowAction<Booking> | null>(
    null
  );

  // Initialize title from URL search params if available
  const initialTitle = React.useMemo(() => {
    const matchingStatus = statusFilters.find(
      (status) => status.value === searchParams?.payment_status
    );
    return matchingStatus?.title ?? "Successful Bookings";
  }, [searchParams?.payment_status]);

  const [title, setTitle] = React.useState(initialTitle);

  const columns = useMemo(() => getBookingColumns({ setRowAction }), []);

  const getRowId = useCallback(
    (originalRow: Booking) => String(originalRow?.id || ""),
    []
  );

  const filterFields = useMemo<DataTableFilterField<Booking>[]>(
    () => [
      {
        id: "payment_status",
        label: "Filter By",
        type: "dropdown",
        options: statusFilters.map((option) => ({
          label: toSentenceCase(option.title),
          value: option.value,
          icon: undefined,
          count: option?.count || 0,
        })),
      },
    ],
    []
  );

  const { table } = useDataTable({
    data,
    columns,
    pageCount: 1,
    filterFields,
    enableAdvancedFilter: false,
    initialState: {
      sorting: [{ id: "booking_date" as keyof Booking, desc: true }],
      columnPinning: { right: ["actions"] },
      globalFilter: "",
    },
    getRowId,
    shallow: false,
    clearOnDefault: true,
  });

  // Update title when filter changes (from URL or UI)
  const columnFilters = table.getState().columnFilters;
  const urlPaymentStatus = searchParams?.payment_status;

  React.useEffect(() => {
    // First check URL search params
    if (urlPaymentStatus) {
      const matchingStatus = statusFilters.find(
        (status) => status.value === urlPaymentStatus
      );
      if (matchingStatus) {
        setTitle(matchingStatus.title);
        return;
      }
    }

    // Then check table filter state
    const column = table.getColumn("payment_status");
    const currentFilter = column?.getFilterValue() as string | undefined;
    const matchingStatus = statusFilters.find(
      (status) => status.value === currentFilter
    );
    setTitle(matchingStatus?.title ?? "Successful Bookings");
  }, [urlPaymentStatus, columnFilters, table]);

  return (
    <section className="w-full min-w-0 relative p-6">
      <div className="w-full min-w-0 overflow-x-auto">
        <DataTable table={table} className="min-w-0">
          <DataTableToolbar
            className="bg-background p-6 border rounded-lg mb-4 w-full min-w-0"
            table={table}
            filterFields={filterFields}
            title={title}
          >
            <TableToolbarActions table={table} />
          </DataTableToolbar>
        </DataTable>
      </div>
    </section>
  );
}

export default React.memo(BookingsDataTable);
