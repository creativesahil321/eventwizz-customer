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
import { useEffect, useMemo, useRef, useState } from "react";
import { getTransactionColumns } from "./columns";
import { EmptyPlaceholder } from "@/components/empty-placeholder";
import { Receipt } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TransactionLoadMoreCardSkeleton,
  TransactionsListSkeleton,
} from "./skeleton-loader";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { TransactionItemComponent } from "./transaction-item";

interface TransactionListProps {
  transactions: Transaction[];
  onViewDetails: (transaction: Transaction) => void;
  isLoading?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
}

export function TransactionListComponent({
  transactions,
  onViewDetails,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: TransactionListProps) {
  const { formatLocale: formatMoneyLocale } = useCurrencyFormat();
  const [sorting, setSorting] = useState<SortingState>([]);
  const loadMoreRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          onLoadMore?.();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px",
      },
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  if (isLoading) {
    return <TransactionsListSkeleton />;
  }

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
      <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-white md:hidden">
        {table.getRowModel().rows.map((row) => (
          <TransactionItemComponent
            key={row.original.id}
            transaction={row.original}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>

      <section className="hidden overflow-x-auto overflow-y-visible rounded-lg border border-[var(--color-border)] bg-white md:block">
        <Table className="min-w-[900px]">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-gray-50">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="whitespace-nowrap px-3 py-4 font-semibold first:pl-4 last:pr-4 sm:px-4"
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
                key={row.original.id}
                className="border-b transition-colors hover:bg-slate-100"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className="whitespace-nowrap px-3 py-4 text-xs first:pl-4 last:pr-4 sm:px-4 sm:text-sm"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {isFetchingNextPage
              ? Array.from({ length: 3 }).map((_, rowIndex) => (
                  <TableRow key={`load-more-${rowIndex}`}>
                    {columns.map((column, cellIndex) => (
                      <TableCell
                        key={`${String(column.id ?? cellIndex)}-${rowIndex}`}
                        className="px-3 py-4 first:pl-4 last:pr-4 sm:px-4"
                      >
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : null}
          </TableBody>
        </Table>
      </section>

      {isFetchingNextPage ? <TransactionLoadMoreCardSkeleton /> : null}

      <div ref={loadMoreRef} className="h-4" aria-hidden />
    </div>
  );
}
