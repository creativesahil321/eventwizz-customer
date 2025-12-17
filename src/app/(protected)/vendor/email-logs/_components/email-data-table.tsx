"use client";
import { useDataTable } from "@/hooks/data-table/use-data-table";
import React, { useMemo, useCallback } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { getColumns } from "./columns";
import { DataTableRowAction, EmailLog, SearchParams } from "../_lib/types";
import { useEmailLogs } from "../_lib/queries";
import { DataTableToolbar } from "./data-table-toolbar";
import { EmailReplyDialog } from "./_email-log-reply";
import { DeleteEmailDialog } from "./_email-log-delete";
import { EmailShowDialog } from "./_email-log-show";

type EmailLogDataTableProps = {
  initialData: EmailLog[];
  search: SearchParams;
};

function EmailLogsDataTable({ initialData, search }: EmailLogDataTableProps) {
  const [rowAction, setRowAction] =
    React.useState<DataTableRowAction<EmailLog> | null>(null);
  const columns = useMemo(() => getColumns({ setRowAction }), [setRowAction]);
  const { data: logs, isError, error } = useEmailLogs(search);
  const emailLogs = useMemo(
    () => logs?.data?.data ?? initialData ?? [],
    [logs?.data, initialData]
  );
  const pageCount = useMemo(
    () => Number(search?.perPage) || 20,
    [search?.perPage]
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
    initialState: {
      sorting: [{ id: "created_at", desc: true }],
    },
    getRowId,
    shallow: false,
    clearOnDefault: true,
  });

  if (isError) {
    return <div>Error loading menus: {error?.message || "Unknown error"}</div>;
  }

  return (
    <section className="w-full min-w-0 relative">
      <div className="w-full min-w-0 overflow-x-auto">
        <DataTable table={table} className="min-w-0">
          <DataTableToolbar
            className="bg-background p-6 mb-4 border rounded-lg min-w-0"
            table={table}
            filterFields={[]}
          ></DataTableToolbar>
        </DataTable>
      </div>
      {rowAction?.type === "reply" && (
        <EmailReplyDialog
          email={rowAction?.row?.original ? rowAction?.row.original : null}
          open={rowAction?.type === "reply"}
          onOpenChange={() => setRowAction(null)}
          showTrigger={false}
          onSuccess={() => rowAction?.row.toggleSelected(false)}
        />
      )}
      {rowAction?.type === "show" && (
        <EmailShowDialog
          open={rowAction?.type === "show"}
          onOpenChange={() => setRowAction(null)}
          email={rowAction?.row?.original ? rowAction?.row.original : null}
          showTrigger={false}
          onSuccess={() => rowAction?.row.toggleSelected(false)}
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
