"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";
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
import { cn } from "@/lib/utils";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import {
  useAdminTransactions,
  useDownloadAdminReceipt,
} from "@/services/admin/transactions";
import { AdminTransactionsTableSkeleton } from "./skeleton-loader";

type AdminTransactionsDataTableProps = {
  search: SearchParams;
  onEarningsUpdate?: (earnings: string) => void;
};

export function AdminTransactionsDataTable({
  search,
  onEarningsUpdate,
}: AdminTransactionsDataTableProps) {
  const { formatLocale: formatMoneyLocale } = useCurrencyFormat();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: Number(search.per_page) || 30,
  });

  const downloadReceiptMutation = useDownloadAdminReceipt();

  const handleDownloadReceipt = useCallback(
    (paymentId: number) => {
      downloadReceiptMutation.mutate(paymentId);
    },
    [downloadReceiptMutation],
  );

  const downloadingPaymentId =
    downloadReceiptMutation.isPending &&
    downloadReceiptMutation.variables != null
      ? Number(downloadReceiptMutation.variables)
      : null;

  const columns = useMemo(
    () =>
      getTransactionColumns({
        onDownloadReceipt: handleDownloadReceipt,
        downloadingPaymentId,
        formatMoneyLocale,
      }),
    [downloadingPaymentId, formatMoneyLocale, handleDownloadReceipt],
  );

  const { data, isLoading, isError, isFetching } = useAdminTransactions({
    search: search.search,
    status: search.status,
    from_date: search.from_date,
    to_date: search.to_date,
    page: Number(search.page) || pagination.pageIndex + 1,
    per_page: Number(search.per_page) || pagination.pageSize,
  });

  useEffect(() => {
    if (data?.earnings != null && onEarningsUpdate) {
      onEarningsUpdate(data.earnings);
    }
  }, [data, onEarningsUpdate]);

  const transactions: Transaction[] = data?.data ?? [];

  const table = useReactTable({
    data: transactions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    state: { sorting, pagination },
  });

  if (isLoading) {
    return <AdminTransactionsTableSkeleton rowCount={9} />;
  }

  if (isError) {
    return (
      <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm p-8">
        <div className="text-center text-destructive min-h-[280px] flex flex-col items-center justify-center">
          <p className="text-lg font-medium">Failed to load transactions</p>
          <p className="text-sm mt-2">Please try again later</p>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
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
    <div
      className={cn(
        "flex w-full max-w-full min-w-0 flex-col gap-2.5",
        isFetching && "opacity-70 transition-opacity",
      )}
    >
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
                          header.getContext(),
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
                      cell.getContext(),
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
