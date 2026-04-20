"use client";

import { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  type PaginationState,
  type SortingState,
  type Updater,
} from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { TableRow, TableCell } from "@/components/ui/table";
import { getSystemLogColumns } from "./columns";
import type { SystemLogEntry, SystemLogLevel } from "../_lib/types";
import type { SystemLogApiRow } from "@/services/admin/system-logs";

function normalizeLevel(level: string): SystemLogLevel {
  const u = level.toUpperCase();
  if (u === "WARNING") return "warning";
  if (u === "ERROR") return "error";
  return "info";
}

function mapRows(rows: SystemLogApiRow[], page: number): SystemLogEntry[] {
  return rows.map((row, idx) => ({
    id: `${page}-${idx}-${row.time}`,
    level: normalizeLevel(row.level),
    time: row.time,
    description: row.description,
  }));
}

interface SystemLogsTableProps {
  rows: SystemLogApiRow[];
  page: number;
  pageCount: number;
  pageIndex: number;
  pageSize: number;
  onPaginationChange: (pageIndex: number, pageSize: number) => void;
  isFetching?: boolean;
}

export function SystemLogsTable({
  rows,
  page,
  pageCount,
  pageIndex,
  pageSize,
  onPaginationChange,
  isFetching,
}: SystemLogsTableProps) {
  const sorting = useMemo<SortingState>(() => [], []);

  const data = useMemo(() => mapRows(rows, page), [rows, page]);

  const columns = useMemo(() => getSystemLogColumns(), []);

  const pagination: PaginationState = {
    pageIndex,
    pageSize,
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.max(1, pageCount),
    onPaginationChange: (updater: Updater<PaginationState>) => {
      const next = (updater as (p: PaginationState) => PaginationState)(
        pagination
      );
      onPaginationChange(next.pageIndex, next.pageSize);
    },
    state: { sorting, pagination },
  });

  return (
    <div
      className={`flex w-full max-w-full min-w-0 flex-col gap-3 transition-opacity ${
        isFetching ? "opacity-70" : ""
      }`}
    >
      <DataTable
        className="[&_tbody_tr:nth-child(even)]:bg-muted/30 [&_tbody_tr:nth-child(odd)]:bg-background [&>section]:pt-4 sm:[&>section]:pt-5 [&_thead_th]:!h-auto [&_thead_th]:min-h-12 [&_thead_th]:py-3.5 [&_thead_th]:align-middle"
        table={table}
        tableClassName="w-full min-w-[720px] table-fixed border-collapse"
        showPagination={false}
        emptyStateRenderer={() => (
          <TableRow>
            <TableCell
              colSpan={columns.length}
              className="h-32 text-center text-muted-foreground whitespace-normal"
            >
              No system logs found.
            </TableCell>
          </TableRow>
        )}
      />
      <footer className="sticky bottom-0 z-[1] mt-2 rounded-lg border border-[var(--color-border)] bg-background/95 px-3 py-3 shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 min-w-0 sm:px-4">
        <div className="flex flex-col gap-2.5 min-w-0">
          <DataTablePagination table={table} />
        </div>
      </footer>
    </div>
  );
}
