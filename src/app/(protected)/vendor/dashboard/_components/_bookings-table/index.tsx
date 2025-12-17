"use client";
import React from "react";
import { DataTableFilterItem } from "@/types";
import { getColumns } from "./columns";
import { useDashboardBookings } from "../../_lib/queries";
import { Booking, DataTableRowAction, SearchParams } from "../../_lib/types";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DataTable } from "@/components/data-table/data-table";
import { useDataTable } from "@/hooks/data-table/use-data-table";
import { DataTableToolbar } from "./data-table-toolbar";
import ShowBookingDialog from "./_show-booking";

type DashboardBookingsTableProps = {
  initialData: Booking[];
  search: SearchParams;
};

export default function DashboardBookingsTable({
  initialData,
  search,
}: DashboardBookingsTableProps) {
  const [rowAction, setRowAction] =
    React.useState<DataTableRowAction<Booking> | null>(null);
  const columns = React.useMemo(
    () => getColumns({ setRowAction }),
    [setRowAction]
  );

  const {
    data: orders,
    isError,
    error,
  } = useDashboardBookings({
    ...search,
    options: {
      initialData: {
        status: 200,
        data: { data: initialData },
        error: [],
        message: "Orders loaded from server",
      },
    },
  });
  const getRowId = React.useCallback(
    (originalRow: Booking) => String(originalRow?.id || ""),
    []
  );

  const bookingsHistory = React.useMemo(
    () => orders?.data?.data ?? [],
    [orders?.data]
  );

  const filterFields = React.useMemo<DataTableFilterItem[]>(
    () => [
      {
        id: "event_name",
        label: "Search by Event",
        placeholder: "Search by Event",
        options: [],
        column: "event_name",
        value: [],
      },
    ],
    []
  );

  const { table } = useDataTable({
    data: bookingsHistory,
    columns,
    pageCount: search.per_page ? Number(search.per_page) : 30,
    filterFields,
    enableAdvancedFilter: false,
    initialState: {
      sorting: [{ id: "created_at", desc: true }],
      columnPinning: { right: ["actions"] },
    },
    getRowId,
    shallow: false,
    clearOnDefault: true,
  });

  const title = "Recent Orders";

  return (
    <section className="w-full relative">
      {isError ? (
        <div className="p-4 text-red-500">
          Error loading orders: {error?.message || "Unknown error"}
        </div>
      ) : bookingsHistory.length === 0 ? (
        <DataTableSkeleton
          columnCount={6}
          cellWidths={["10rem", "40rem", "12rem", "12rem", "8rem", "8rem"]}
          shrinkZero
        />
      ) : (
        <>
          <ScrollArea className="w-full">
            <ScrollBar orientation="horizontal" />
            <DataTable table={table}>
              <DataTableToolbar
                className="bg-background p-6 border rounded-lg"
                table={table}
                filterFields={filterFields}
                title={title}
              />
            </DataTable>
          </ScrollArea>
          {rowAction?.type === "show" && (
            <ShowBookingDialog
              open={rowAction?.type === "show"}
              onOpenChange={() => setRowAction(null)}
              booking={
                rowAction?.row?.original ? rowAction?.row.original : null
              }
              showTrigger={false}
              onSuccess={() => rowAction?.row?.toggleSelected(false)}
            />
          )}
        </>
      )}
    </section>
  );
}
