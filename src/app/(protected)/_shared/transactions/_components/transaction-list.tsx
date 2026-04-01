"use client";

import { Transaction } from "../_lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  SortingState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { getTransactionColumns } from "./columns";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { EmptyPlaceholder } from "@/components/empty-placeholder";
import { Receipt } from "lucide-react";
import { TransactionsListSkeleton } from "./skeleton-loader";
import { useCurrencyFormat } from "@/hooks/use-currency-format";

interface TransactionMeta {
  total: number;
  current_page: number;
  per_page: number;
  last_page: number;
}

interface TransactionListProps {
  transactions: Transaction[];
  meta: TransactionMeta | undefined;
  onViewDetails: (transaction: Transaction) => void;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export function TransactionListComponent({
  transactions,
  meta,
  onViewDetails,
  onPageChange,
  isLoading,
}: TransactionListProps) {
  const { formatLocale: formatMoneyLocale } = useCurrencyFormat();
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(
    () =>
      getTransactionColumns({
        onViewDetails,
        formatMoneyLocale,
      }),
    [onViewDetails, formatMoneyLocale],
  );

  const table = useReactTable({
    data: transactions || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  // If loading, show a skeleton
  if (isLoading) {
    return <TransactionsListSkeleton />;
  }

  // If no transactions or invalid data, show empty state
  if (
    !transactions ||
    !Array.isArray(transactions) ||
    transactions.length === 0
  ) {
    return (
      <EmptyPlaceholder
        icon={<Receipt className="h-10 w-10 text-muted-foreground" />}
        title="No transactions"
        description="You don't have any transactions yet."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="border rounded-md overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="bg-gray-50">
                  {headerGroup.headers.map((header) => (
                    <TableHead 
                      key={header.id} 
                      className="font-semibold text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap first:pl-4"
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
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell 
                      key={cell.id}
                      className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm first:pl-4"
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
        </div>
      </div>

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <Pagination className="mt-4">
          <PaginationContent className="flex-wrap gap-2 justify-center">
            {meta.current_page > 1 && (
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => onPageChange(meta.current_page - 1)}
                  aria-label="Go to previous page"
                />
              </PaginationItem>
            )}

            {/* First page */}
            <PaginationItem>
              <PaginationLink
                onClick={() => onPageChange(1)}
                isActive={meta.current_page === 1}
              >
                1
              </PaginationLink>
            </PaginationItem>

            {/* Ellipsis if needed */}
            {meta.current_page > 3 && (
              <PaginationItem>
                <span className="px-4">...</span>
              </PaginationItem>
            )}

            {/* Current page and neighbors */}
            {Array.from({ length: meta.last_page }, (_, i) => i + 1)
              .filter(
                (page) =>
                  page > 1 &&
                  page < meta.last_page &&
                  Math.abs(page - meta.current_page) <= 1
              )
              .map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => onPageChange(page)}
                    isActive={page === meta.current_page}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}

            {/* Ellipsis if needed */}
            {meta.current_page < meta.last_page - 2 && (
              <PaginationItem>
                <span className="px-4">...</span>
              </PaginationItem>
            )}

            {/* Last page */}
            {meta.last_page > 1 && (
              <PaginationItem>
                <PaginationLink
                  onClick={() => onPageChange(meta.last_page)}
                  isActive={meta.current_page === meta.last_page}
                >
                  {meta.last_page}
                </PaginationLink>
              </PaginationItem>
            )}

            {meta.current_page < meta.last_page && (
              <PaginationItem>
                <PaginationNext
                  onClick={() => onPageChange(meta.current_page + 1)}
                  aria-label="Go to next page"
                />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
