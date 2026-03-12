"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  type SortingState,
  type PaginationState,
} from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { TableRow, TableCell } from "@/components/ui/table";
import { getSystemLogColumns } from "./columns";
import { SYSTEM_LOGS_DUMMY_DATA } from "../_lib/dummy-data";

export function SystemLogsTable() {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "timestamp", desc: true },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const columns = useMemo(() => getSystemLogColumns(), []);

  const table = useReactTable({
    data: SYSTEM_LOGS_DUMMY_DATA,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    state: { sorting, pagination },
  });

  return (
    <div className="flex w-full max-w-full min-w-0 flex-col gap-2.5">
      <DataTable
        table={table}
        tableClassName="min-w-[700px]"
        showPagination={false}
        emptyStateRenderer={() => (
          <TableRow>
            <TableCell
              colSpan={columns.length}
              className="h-32 text-center text-muted-foreground"
            >
              No system logs found.
            </TableCell>
          </TableRow>
        )}
      />
      <footer className="bg-background border w-full p-4 my-4 rounded-lg min-w-0">
        <div className="flex flex-col gap-2.5 min-w-0">
          <DataTablePagination table={table} />
        </div>
      </footer>
    </div>
  );
}
