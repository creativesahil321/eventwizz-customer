"use client";

import React from "react";
import {
  TransactionFilters,
  Transaction,
  TransactionMeta,
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

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFilterChange({ search: searchInput });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput, filters.search, onFilterChange]);

  if (isLoading && safeTransactions.length === 0) {
    return <TransactionsTableSkeleton />;
  }

  return (
    <section className="w-full max-w-full min-w-0 relative text-black pb-20 sm:pb-6 overflow-x-hidden">
      <div className="min-w-0 max-w-full bg-white p-4 sm:p-6 rounded-md shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 min-w-0">
          <h1 className="text-xl sm:text-2xl title-header font-bold">
            Transactions
          </h1>
          {stats && (
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
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
        <div className="p-4 sm:p-6 text-center text-gray-500 bg-white mt-2 rounded-md shadow-sm">
          <p className="text-sm sm:text-base">
            No transactions found. Try adjusting your filters.
          </p>
        </div>
      ) : (
        <div className="bg-white mt-2 rounded-md shadow-sm overflow-hidden max-w-full">
          <div className="overflow-x-auto px-4 sm:px-6 max-w-full">
            <div className="min-w-full inline-block align-middle">
              <TransactionListComponent
                transactions={safeTransactions}
                meta={meta}
                onViewDetails={onViewDetails}
                onPageChange={onPageChange}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default React.memo(TransactionsDataTable);
