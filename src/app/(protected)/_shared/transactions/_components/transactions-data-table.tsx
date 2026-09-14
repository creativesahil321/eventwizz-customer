"use client";

import React from "react";
import {
  TransactionFilters,
  Transaction,
  TransactionStats,
  TransactionStatus,
} from "../_lib/types";
import { TRANSACTION_STATUSES, PAYMENT_METHODS } from "../_lib/constants";
import { TransactionListComponent } from "./transaction-list";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search } from "lucide-react";
import { TransactionsTableSkeleton } from "./skeleton-loader";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { pageCardClassName } from "@/app/(protected)/_components/page-header-card";

interface TransactionsDataTableProps {
  transactions: Transaction[];
  filters: TransactionFilters;
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onFilterChange: (filters: Partial<TransactionFilters>) => void;
  onViewDetails: (transaction: Transaction) => void;
  stats?: TransactionStats;
}

export function TransactionsDataTable({
  transactions,
  filters,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onFilterChange,
  onViewDetails,
  stats,
}: TransactionsDataTableProps) {
  const { formatLocale: formatMoneyDisplay } = useCurrencyFormat();
  const [searchInput, setSearchInput] = React.useState(filters.search || "");

  // Check if any filters are actually applied (not "all" or empty)
  const hasFilters =
    (filters.status && filters.status !== "all") ||
    (filters.payment_method && filters.payment_method !== "all") ||
    (filters.payment_date && filters.payment_date.trim() !== "") ||
    (filters.search && filters.search.trim() !== "") ||
    (searchInput && searchInput.trim() !== "");

  // Ensure transactions is always an array
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  // Debounce search input (treat undefined and "" as the same so we do not refetch)
  React.useEffect(() => {
    const next = searchInput.trim();
    const current = (filters.search ?? "").trim();
    if (next === current) return;

    const timer = setTimeout(() => {
      const n = searchInput.trim();
      const c = (filters.search ?? "").trim();
      if (n !== c) {
        onFilterChange({ search: n || undefined });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput, filters.search, onFilterChange]);

  if (isLoading && safeTransactions.length === 0) {
    return <TransactionsTableSkeleton />;
  }

  return (
    <section className="relative w-full min-w-0 max-w-full overflow-x-hidden pb-20 text-black sm:pb-6">
      <div className={pageCardClassName("min-w-0 max-w-full overflow-hidden")}>
        <div className="mb-4 flex min-w-0 flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-black title-header sm:text-2xl">
              Transactions
            </h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              View your payment history and transaction details
            </p>
          </div>
          {stats && (
            <div className="flex flex-wrap items-center gap-3 text-xs sm:gap-4 sm:text-sm">
              <div className="text-muted-foreground">
                Total:{" "}
                <span className="font-semibold text-foreground">
                  {stats.total_transactions}
                </span>
              </div>
              <div className="text-muted-foreground">
                Amount:{" "}
                <span className="font-semibold text-foreground">
                  {formatMoneyDisplay(stats.total_amount_value)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-4 sm:mb-6 min-w-0">
          {/* Search Input */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 w-full min-w-0 sm:flex-1 sm:max-w-xs">
            <span className="text-sm font-medium mb-1 sm:mb-0 shrink-0">Search</span>
            <div className="relative w-full min-w-0 max-w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search transactions..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 h-9 w-full"
              />
            </div>
          </div>

          {/* Date Filter - format hint when empty, hidden on sm+ to avoid overlap with browser calendar icon (same as vendor booking date filter) */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 w-full min-w-0 sm:w-auto max-w-full">
            <span className="text-sm font-medium mb-1 sm:mb-0 shrink-0">Date</span>
            <div className="flex flex-col gap-1 shrink-0 w-full sm:w-[180px]">
              <div className="relative w-full">
                <Input
                  type="date"
                  value={filters.payment_date || ""}
                  onChange={(e) =>
                    onFilterChange({ payment_date: e.target.value })
                  }
                  className="w-full min-w-0 sm:w-[180px] h-9 box-border"
                  aria-label="Filter by payment date (dd-mm-yyyy)"
                />
                {!filters.payment_date && (
                  <span
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 sm:hidden"
                    aria-hidden
                  >
                    dd-mm-yyyy
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 w-full min-w-0 sm:w-auto max-w-full">
            <span className="text-sm font-medium mb-1 sm:mb-0 shrink-0">Status</span>
            <Select
              value={filters.status || "all"}
              onValueChange={(value) =>
                onFilterChange({
                  status:
                    value === "all" ? undefined : (value as TransactionStatus),
                } as Partial<TransactionFilters>)
              }
            >
              <SelectTrigger className="w-full max-w-full min-w-0 sm:w-[180px] h-9">
                <SelectValue placeholder="All statuses" />
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

          {/* Payment Method Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 w-full min-w-0 sm:w-auto max-w-full">
            <span className="text-sm font-medium mb-1 sm:mb-0 shrink-0">Method</span>
            <Select
              value={filters.payment_method || "all"}
              onValueChange={(value) =>
                onFilterChange({
                  payment_method: value === "all" ? undefined : value,
                })
              }
            >
              <SelectTrigger className="w-full max-w-full min-w-0 sm:w-[180px] h-9">
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

          {/* Reset Filters Button */}
          {hasFilters && (
            <Button
              variant="event-outline"
              size="sm"
              className="h-9 w-full max-w-full sm:w-auto mt-1 sm:mt-0 sm:self-end shrink-0"
              onClick={() => {
                setSearchInput("");
                onFilterChange({
                  status: undefined,
                  payment_method: undefined,
                  payment_date: undefined,
                  search: undefined,
                });
              }}
            >
              Reset <X className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {safeTransactions.length === 0 && !isLoading ? (
        <div className={pageCardClassName("mt-4 text-center text-gray-500")}>
          <p className="text-sm sm:text-base">
            No transactions found. Try adjusting your filters.
          </p>
        </div>
      ) : (
        <div className={pageCardClassName("mt-4 max-w-full overflow-hidden")}>
          <div className="overflow-x-auto max-w-full">
            <TransactionListComponent
              transactions={safeTransactions}
              onViewDetails={onViewDetails}
              isLoading={isLoading}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onLoadMore={onLoadMore}
            />
          </div>
        </div>
      )}
    </section>
  );
}

export default React.memo(TransactionsDataTable);
