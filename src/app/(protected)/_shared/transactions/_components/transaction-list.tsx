"use client";

import { Transaction } from "../_lib/types";

interface TransactionMeta {
  total: number;
  current_page: number;
  per_page: number;
  last_page: number;
}
import { TransactionItemComponent } from "./transaction-item";
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
      <div className="border rounded-md overflow-hidden">
        {transactions.map((transaction) => (
          <TransactionItemComponent
            key={transaction.id}
            transaction={transaction}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <Pagination className="mt-4">
          <PaginationContent>
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
