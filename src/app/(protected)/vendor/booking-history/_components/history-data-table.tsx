"use client";

import { useDataTable } from "@/hooks/data-table/use-data-table";
import React, { useMemo, useCallback, useEffect } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableRowAction, History, SearchParams } from "../_lib/types";
import { useHistory } from "../_lib/queries";
import { getHistoryColumns } from "./columns";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { DataTableFilterField } from "@/hooks/data-table/use-data-table";
import { toSentenceCase } from "@/lib/utils";
import UpdateHistoryDialog from "./_history-update";
import MailHistoryDialog from "./_history-mail";
import { useRouter } from "next/navigation";
import { useQueryState, parseAsInteger } from "nuqs";
import { useCurrencyFormat } from "@/hooks/use-currency-format";

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
  const { format: formatMoney } = useCurrencyFormat();
  const [rowAction, setRowAction] =
    React.useState<DataTableRowAction<History> | null>(null);
  const columns = useMemo(
    () => getHistoryColumns({ setRowAction, formatMoney }),
    [setRowAction, formatMoney],
  );

  useEffect(() => {
    // Handle view button click
    if (rowAction?.type === "view" && rowAction.row.original.id) {
      router.push(`/vendor/booking-history/${rowAction.row.original.id}`);
    }
  }, [rowAction, router]);

  // Read page and per_page from URL params (managed by useDataTable)
  const [page] = useQueryState(
    "page",
    parseAsInteger.withDefault(1)
  );
  const [per_page] = useQueryState(
    "per_page",
    parseAsInteger.withDefault(30)
  );

  // Convert search params to proper format for query
  // Use URL params for pagination, search prop for filters
  const queryParams = {
    search: typeof search.search === "string" ? search.search : "",
    page: page || 1,
    per_page: per_page || 30,
    status: typeof search.status === "string" ? search.status : "",
    event_date: typeof search.event_date === "string" ? search.event_date : "",
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
    enableClientSideSorting: true,
    initialState: {
      sorting: [{ id: "booking_date", desc: true }],
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
        columnCount={8}
        cellWidths={[
          "10rem",
          "40rem",
          "12rem",
          "12rem",
          "8rem",
          "8rem",
          "8rem",
          "8rem",
        ]}
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
    <>
      <DataTable table={table} />
      {rowAction?.type === "update" && (
        <UpdateHistoryDialog
          open={rowAction?.type === "update"}
          onOpenChange={() => setRowAction(null)}
          history={rowAction?.row?.original ? rowAction?.row?.original : null}
          showTrigger={false}
          onSuccess={() => rowAction?.row?.toggleSelected(false)}
        />
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
    </>
  );
}

export default React.memo(HistoryDataTable);
