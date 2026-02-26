"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { useDataTable } from "@/hooks/data-table/use-data-table";
import { getSystemLogColumns } from "./columns";
import { SYSTEM_LOGS_DUMMY_DATA } from "../_lib/dummy-data";

export function SystemLogsTable() {
  const columns = useMemo(() => getSystemLogColumns(), []);

  const { table } = useDataTable({
    data: SYSTEM_LOGS_DUMMY_DATA,
    columns,
    pageCount: 1,
    filterFields: [],
    enableAdvancedFilter: false,
    enableClientSideSorting: true,
    initialState: {
      sorting: [{ id: "timestamp", desc: true }],
      pagination: { pageSize: 10 },
    },
    getRowId: (row) => (row as { id: string }).id,
    shallow: true,
    clearOnDefault: true,
  });

  return (
    <section className="w-full max-w-full min-w-0 relative">
      <div className="w-full min-w-0 overflow-x-auto">
        <DataTable
          table={table}
          tableClassName="min-w-[700px]"
          className="min-w-0"
        />
      </div>
    </section>
  );
}
