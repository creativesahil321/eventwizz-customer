"use client";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import React from "react";
import {
  TransactionFilters,
  Transaction,
  TransactionMeta,
  TransactionStats,
  TransactionStatus,
  TransactionType,
} from "../_lib/types";
import {
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
  PAYMENT_METHODS,
} from "../_lib/constants";
import { TransactionListComponent } from "./transaction-list";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { TransactionsTableSkeleton } from "./skeleton-loader";

interface TransactionsDataTableProps {
  transactions: Transaction[];
  meta: TransactionMeta | undefined;
  filters: TransactionFilters;
  isLoading: boolean;
  onFilterChange: (filters: Partial<TransactionFilters>) => void;
  onPageChange: (page: number) => void;
  onViewDetails: (transaction: Transaction) => void;
  stats?: TransactionStats;
}

export function TransactionsDataTable({
  transactions,
  meta,
  filters,
  isLoading,
  onFilterChange,
  onPageChange,
  onViewDetails,
  stats,
}: TransactionsDataTableProps) {
  const hasFilters =
    !!filters.status ||
    !!filters.type ||
    !!filters.payment_method ||
    !!filters.search;

  // Ensure transactions is always an array
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  if (isLoading && safeTransactions.length === 0) {
    return <TransactionsTableSkeleton />;
  }

  return (
    <section className="w-full min-w-0 relative text-black">
      <div className="min-w-0 bg-white p-4 sm:p-6 rounded-md shadow-sm">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-2xl title-header font-bold">Transactions</h1>
          {stats && (
            <div className="flex items-center gap-4 text-sm">
              <div className="text-muted-foreground">
                Total:{" "}
                <span className="font-semibold text-foreground">
                  {stats.total_transactions}
                </span>
              </div>
              <div className="text-muted-foreground">
                Amount:{" "}
                <span className="font-semibold text-foreground">
                  {stats.total_amount}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 w-full sm:w-auto">
            <span className="text-sm font-medium mb-1 sm:mb-0">Status</span>
            <Select
              value={filters.status || "all"}
              onValueChange={(value) =>
                onFilterChange({
                  status:
                    value === "all" ? undefined : (value as TransactionStatus),
                } as Partial<TransactionFilters>)
              }
            >
              <SelectTrigger className="w-full sm:w-[180px] h-9">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                {TRANSACTION_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 w-full sm:w-auto">
            <span className="text-sm font-medium mb-1 sm:mb-0">Type</span>
            <Select
              value={filters.type || "all"}
              onValueChange={(value) =>
                onFilterChange({
                  type:
                    value === "all" ? undefined : (value as TransactionType),
                } as Partial<TransactionFilters>)
              }
            >
              <SelectTrigger className="w-full sm:w-[180px] h-9">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                {TRANSACTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 w-full sm:w-auto">
            <span className="text-sm font-medium mb-1 sm:mb-0">Method</span>
            <Select
              value={filters.payment_method || "all"}
              onValueChange={(value) =>
                onFilterChange({
                  payment_method: value === "all" ? undefined : value,
                })
              }
            >
              <SelectTrigger className="w-full sm:w-[180px] h-9">
                <SelectValue placeholder="All Methods" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasFilters && (
            <Button
              variant="event-outline"
              size="sm"
              className="h-9 w-full sm:w-auto mt-1 sm:mt-0 sm:self-end"
              onClick={() =>
                onFilterChange({
                  status: undefined,
                  type: undefined,
                  payment_method: undefined,
                  search: undefined,
                })
              }
            >
              Reset <X className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {safeTransactions.length === 0 && !isLoading ? (
        <div className="p-6 text-center text-gray-500 bg-white mt-2 rounded-md shadow-sm">
          No transactions found. Try adjusting your filters.
        </div>
      ) : (
        <div className="bg-white mt-2 rounded-md shadow-sm">
          <ScrollArea className="h-[calc(100vh-20rem)] sm:h-[calc(100vh-16rem)]">
            <TransactionListComponent
              transactions={safeTransactions}
              meta={meta}
              onViewDetails={onViewDetails}
              onPageChange={onPageChange}
              isLoading={isLoading}
            />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}
    </section>
  );
}

export default React.memo(TransactionsDataTable);
