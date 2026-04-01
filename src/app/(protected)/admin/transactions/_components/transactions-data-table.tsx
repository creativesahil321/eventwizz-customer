"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type SortingState,
  type PaginationState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import type { SearchParams, Transaction } from "../_lib/types";
import { getTransactionColumns } from "./columns";
import { DUMMY_TRANSACTIONS, getDummyEarnings } from "../_lib/dummy-data";
import { cn } from "@/lib/utils";
import { useCurrencyFormat } from "@/hooks/use-currency-format";

type AdminTransactionsDataTableProps = {
  search: SearchParams;
  onEarningsUpdate?: (earnings: string) => void;
};

function parseBookingDate(dateStr: string): Date {
  const [datePart] = dateStr.split(" ");
  const [day, month, year] = datePart.split("-");
  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function AdminTransactionsDataTable({
  search,
  onEarningsUpdate,
}: AdminTransactionsDataTableProps) {
  const { formatLocale: formatMoneyLocale } = useCurrencyFormat();
  const [rowAction, setRowAction] = useState<{
    row: { original: Transaction };
    type: "download";
  } | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 30,
  });

  const columns = useMemo(
    () => getTransactionColumns({ setRowAction, formatMoneyLocale }),
    [formatMoneyLocale],
  );

  const filteredData = useMemo(() => {
    let data = [...DUMMY_TRANSACTIONS];

    const q = (search.search ?? "").toString().toLowerCase().trim();
    if (q) {
      data = data.filter(
        (t) =>
          t.booking_number.toLowerCase().includes(q) ||
          t.transaction_id.toLowerCase().includes(q)
      );
    }

    const status = (search.status ?? "").toString();
    if (status && status !== "all") {
      data = data.filter((t) => t.status.toLowerCase() === status.toLowerCase());
    }

    const fromDate = search.from_date?.toString();
    const toDate = search.to_date?.toString();
    if (fromDate || toDate) {
      data = data.filter((t) => {
        const d = parseBookingDate(t.booking_date).getTime();
        if (fromDate && d < new Date(fromDate).setHours(0, 0, 0, 0))
          return false;
        if (toDate && d > new Date(toDate).setHours(23, 59, 59, 999))
          return false;
        return true;
      });
    }

    return data;
  }, [search.search, search.status, search.from_date, search.to_date]);

  useEffect(() => {
    const earnings = getDummyEarnings(filteredData);
    onEarningsUpdate?.(earnings);
  }, [filteredData, onEarningsUpdate]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    state: { sorting, pagination },
  });

  useEffect(() => {
    if (rowAction?.type === "download") {
      setRowAction(null);
      // Dummy: could trigger file download or toast "Receipt downloaded"
    }
  }, [rowAction]);

  if (filteredData.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm p-8">
        <div className="text-center text-muted-foreground min-h-[280px] flex flex-col items-center justify-center">
          <p className="text-lg font-medium">No transactions found</p>
          <p className="text-sm mt-2">
            Try adjusting your filters or search criteria
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-full min-w-0 flex-col gap-2.5">
      <section className="overflow-x-auto overflow-y-visible bg-white rounded-lg border border-[var(--color-border)] shadow-sm">
        <Table className="min-w-[900px]">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-gray-50">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="font-semibold py-4 px-3 sm:px-4 first:pl-4 last:pr-4 whitespace-nowrap"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="bg-background">
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn("border-b hover:bg-slate-100 transition-colors")}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className="py-4 px-3 sm:px-4 first:pl-4 last:pr-4 whitespace-nowrap"
                  >
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
      <footer className="bg-background border w-full p-4 my-4 rounded-lg min-w-0">
        <div className="flex flex-col gap-2.5 min-w-0">
          <DataTablePagination table={table} />
        </div>
      </footer>
    </div>
  );
}
