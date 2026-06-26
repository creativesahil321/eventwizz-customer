"use client";

import React, { useMemo, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  SortingState,
  ColumnFiltersState,
  PaginationState,
  flexRender,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTableRowAction, SearchParams, Transaction } from "../_lib/types";
import { getTransactionColumns } from "./columns";
import { useVendorTransactions, useDownloadSingleReceipt } from "../_lib/queries";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { TransactionsTableSkeleton } from "./skeleton-loader";
import { useCurrencyFormat } from "@/hooks/use-currency-format";

type TransactionsDataTableProps = {
  search: SearchParams;
  onEarningsUpdate?: (earnings: string) => void;
};

export function TransactionsDataTable({
  search,
  onEarningsUpdate,
}: TransactionsDataTableProps) {
  const { formatLocale: formatMoneyLocale } = useCurrencyFormat();
  const [rowAction, setRowAction] =
    React.useState<DataTableRowAction<Transaction> | null>(null);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 30,
  });

  const columns = useMemo(
    () => getTransactionColumns({ setRowAction, formatMoneyLocale }),
    [formatMoneyLocale],
  );

  const { data, isLoading, isError } = useVendorTransactions({
    search: search.search,
    status: search.status,
    from_date: search.from_date,
    to_date: search.to_date,
    page: Number(search.page) || 1,
    per_page: Number(search.per_page) || 30,
  });

  const downloadReceiptMutation = useDownloadSingleReceipt();

  // Update earnings when data changes
  useEffect(() => {
    if (data && "earnings" in data && onEarningsUpdate) {
      onEarningsUpdate(data.earnings as string);
    }
  }, [data, onEarningsUpdate]);

  const transactions: Transaction[] = data?.data ?? [];

  const table = useReactTable({
    data: transactions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
  });

  useEffect(() => {
    if (rowAction?.type !== "download") return;
    const transaction = rowAction.row.original;
    const id = transaction.payment_id;
    setRowAction(null);
    downloadReceiptMutation.mutate(id);
  }, [rowAction]);

  if (isLoading) {
    return <TransactionsTableSkeleton className="animate-pulse" />;
  }

  if (isError) {
    return (
      <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm p-8">
        <div className="text-center text-destructive min-h-[400px] flex flex-col items-center justify-center">
          <p className="text-lg font-medium">Failed to load transactions</p>
          <p className="text-sm mt-2">Please try again later</p>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm p-8">
        <div className="text-center text-muted-foreground min-h-[400px] flex flex-col items-center justify-center">
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
                className="border-b hover:bg-slate-100 transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className="py-4 px-3 sm:px-4 first:pl-4 last:pr-4 whitespace-nowrap"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
