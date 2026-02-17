"use client";
import { useDataTable } from "@/hooks/data-table/use-data-table";
import React, { useMemo, useCallback, useEffect } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { getColumns } from "./columns";
import { DataTableRowAction, EmailLog, SearchParams } from "../_lib/types";
import { useEmailLogs } from "../_lib/queries";
import { ResendEmailDialog } from "./_email-log-resend";
import { DeleteEmailDialog } from "./_email-log-delete";
import { EmailShowDialog } from "./_email-log-show";
import { useQueryState, parseAsInteger } from "nuqs";
import type { Table } from "@tanstack/react-table";

type EmailLogDataTableProps = {
  initialData: EmailLog[];
  search: SearchParams;
  tableRef?: React.RefObject<Table<EmailLog> | null>;
};

function EmailLogsDataTable({ initialData, search, tableRef }: EmailLogDataTableProps) {
  const [rowAction, setRowAction] =
    React.useState<DataTableRowAction<EmailLog> | null>(null);
  const columns = useMemo(() => getColumns({ setRowAction }), [setRowAction]);

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
    from_date: typeof search.from_date === "string" ? search.from_date : "",
    to_date: typeof search.to_date === "string" ? search.to_date : "",
  };

  const { data: logsResponse, isError, error } = useEmailLogs(queryParams);
  const emailLogs = useMemo(
    () => logsResponse?.data ?? initialData ?? [],
    [logsResponse?.data, initialData]
  );
  const pageCount = useMemo(
    () => logsResponse?.meta?.last_page || 1,
    [logsResponse?.meta?.last_page]
  );
  const getRowId = useCallback(
    (originalRow: EmailLog) => String(originalRow?.id || ""),
    []
  );

  const { table } = useDataTable({
    data: emailLogs,
    columns,
    pageCount,
    filterFields: [],
    enableAdvancedFilter: false,
    enableClientSideSorting: true,
    initialState: {
      sorting: [{ id: "date", desc: true }],
    },
    getRowId,
    shallow: false,
    clearOnDefault: true,
  });

  // Assign table to ref for bulk operations
  useEffect(() => {
    if (tableRef) {
      tableRef.current = table;
    }
  }, [table, tableRef]);

  if (isError) {
    return (
      <div className="p-4 text-center text-destructive">
        Error loading email logs: {error?.message || "Unknown error"}
      </div>
    );
  }

  return (
    <section className="w-full max-w-full min-w-0 relative">
      <div className="w-full min-w-0 overflow-x-auto">
        <DataTable
          table={table}
          tableClassName="min-w-[700px]"
          className="min-w-0"
        />
      </div>
      {rowAction?.type === "resend" && (
        <ResendEmailDialog
          email={rowAction?.row?.original ? rowAction.row.original : null}
          open={rowAction?.type === "resend"}
          onOpenChange={(open) => {
          if (!open) setRowAction(null);
        }}
        />
      )}
      {rowAction?.type === "show" && (
        <EmailShowDialog
          open={rowAction?.type === "show"}
          onOpenChange={() => setRowAction(null)}
          email={rowAction?.row?.original ? rowAction?.row.original : null}
          showTrigger={false}
        />
      )}
      {rowAction?.type === "delete" && (
        <DeleteEmailDialog
          open={rowAction?.type === "delete"}
          onOpenChange={() => setRowAction(null)}
          email={rowAction?.row?.original ? rowAction?.row.original : null}
          showTrigger={false}
          onSuccess={() => rowAction?.row.toggleSelected(false)}
        />
      )}
    </section>
  );
}

export default React.memo(EmailLogsDataTable);
