"use client";

import { useDataTable } from "@/hooks/data-table/use-data-table";
import React, { useMemo, useCallback, useRef, useEffect } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { DataTableRowAction, History, SearchParams } from "../_lib/types";
import { useHistory } from "../_lib/queries";
import { getHistoryColumns } from "./columns";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { DataTableFilterField } from "@/hooks/data-table/use-data-table";
import { toSentenceCase } from "@/lib/utils";
import UpdateHistoryDialog from "./_history-update";
import { exportTableToCSV } from "@/lib/export";
import MailHistoryDialog from "./_history-mail";
import { useRouter } from "next/navigation";

const dynamicStatusFilter = [
  { id: 1, title: "Successful Orders", value: "success", count: 0 },
  { id: 2, title: "Refunded Orders", value: "refunded", count: 0 },
  { id: 3, title: "Overdue Orders", value: "overdue", count: 0 },
  { id: 4, title: "Cancelled Orders", value: "cancelled", count: 0 },
];

type HistoryDataTableProps = {
  search: SearchParams;
  tableRef?: React.RefObject<unknown>;
};

function HistoryDataTable({ search, tableRef }: HistoryDataTableProps) {
  const router = useRouter();
  const [rowAction, setRowAction] =
    React.useState<DataTableRowAction<History> | null>(null);
  const columns = useMemo(
    () => getHistoryColumns({ setRowAction }),
    [setRowAction]
  );
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (rowAction?.type === "download" && buttonRef.current) {
      buttonRef.current.click();
    }
    // Handle adjust button click
    if (rowAction?.type === "adjust" && rowAction.row.original.id) {
      router.push(`/vendor/booking-history/${rowAction.row.original.id}`);
    }
    // Handle view button click
    if (rowAction?.type === "view" && rowAction.row.original.id) {
      // For now, same as adjust - you can create a separate view-only modal later
      router.push(`/vendor/booking-history/${rowAction.row.original.id}`);
    }
  }, [rowAction, router]);

  // Convert search params to proper format for query
  const queryParams = {
    search: typeof search.search === "string" ? search.search : "",
    page: Number(search.page) || 1,
    per_page: Number(search.per_page) || 30,
    status: typeof search.status === "string" ? search.status : "",
  };

  const { data: history, isError, isLoading } = useHistory(queryParams);
  const bookingsHistory = useMemo(() => history?.data ?? [], [history?.data]);

  const pageCount = useMemo(
    () => history?.meta?.last_page || 1,
    [history?.meta?.last_page]
  );

  const getRowId = useCallback(
    (originalRow: History) => String(originalRow?.id || ""),
    []
  );

  const filterFields = useMemo<DataTableFilterField<History>[]>(
    () => [
      {
        id: "status",
        label: "Select Search By",
        type: "dropdown",
        options: dynamicStatusFilter.map((option) => ({
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
    data: bookingsHistory,
    columns,
    pageCount,
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

  // Assign table to ref for CSV export
  useEffect(() => {
    if (tableRef) {
      tableRef.current = table;
    }
  }, [table, tableRef]);

  if (isLoading) {
    return (
      <DataTableSkeleton
        columnCount={6}
        cellWidths={["10rem", "40rem", "12rem", "12rem", "8rem", "8rem"]}
        shrinkZero
      />
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6">
        <div className="text-red-500">
          Error loading booking history. Please try again later.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg border border-[var(--color-border)] shadow-md overflow-hidden">
      <div className="w-full">
        <DataTable table={table} />
      </div>
      {rowAction?.type === "update" && (
        <UpdateHistoryDialog
          open={rowAction?.type === "update"}
          onOpenChange={() => setRowAction(null)}
          history={rowAction?.row?.original ? rowAction?.row?.original : null}
          showTrigger={false}
          onSuccess={() => rowAction?.row?.toggleSelected(false)}
        />
      )}
      {rowAction?.type === "download" && (
        <Button
          variant="event-outline"
          ref={buttonRef}
          onClick={() =>
            exportTableToCSV(table, {
              filename: "orders-history",
              excludeColumns: ["select", "actions"],
            })
          }
        >
          CSV
        </Button>
      )}
      {rowAction?.type === "mail" && (
        <MailHistoryDialog
          open={rowAction?.type === "mail"}
          onOpenChange={() => setRowAction(null)}
          history={rowAction?.row?.original ? rowAction?.row?.original : null}
          showTrigger={false}
          onSuccess={() => rowAction?.row?.toggleSelected(false)}
        />
      )}
    </div>
  );
}

export default React.memo(HistoryDataTable);
