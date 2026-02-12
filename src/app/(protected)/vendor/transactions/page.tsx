"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Search, Download, Loader2, RotateCcw } from "lucide-react";
import { Shell } from "@/components/shell";
import { SearchParams } from "./_lib/types";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TransactionsDataTable } from "./_components/transactions-data-table";
import { toast } from "sonner";
import { useVendorTransactions } from "./_lib/queries";
import { cn } from "@/lib/utils";
import { TransactionsTableSkeleton } from "./_components/skeleton-loader";
import { useDebounce } from "@/hooks/data-table/use-debounce";

export default function TransactionsPage() {
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bookingDate, setBookingDate] = useState("");
  const [earnings, setEarnings] = useState("0.00");

  // Debounce search input using existing hook
  const debouncedSearch = useDebounce(globalFilterValue, 500);

  const hasActiveFilters =
    !!debouncedSearch || statusFilter !== "all" || !!bookingDate;

  const handleResetAllFilters = () => {
    setGlobalFilterValue("");
    setStatusFilter("all");
    setBookingDate("");
  };

  // Build search params based on current filters
  const searchParams: SearchParams = {
    page: "1",
    per_page: "30",
    search: debouncedSearch,
    status: statusFilter === "all" ? "" : statusFilter,
    from: bookingDate,
  };

  // Fetch data to track loading state
  const { isLoading, isFetching } = useVendorTransactions({
    search: debouncedSearch,
    status: statusFilter === "all" ? "" : statusFilter,
    booking_date: bookingDate,
    page: 1,
    per_page: 30,
  });

  // Handle earnings update from data table
  const handleEarningsUpdate = useCallback((earningsValue: string) => {
    setEarnings(earningsValue);
  }, []);

  // Handle CSV export
  const handleCSVExport = () => {
    toast.success("Exporting transaction history to CSV...");
    // In production, implement actual CSV export logic
  };

  return (
    <section className="page text-black min-w-0">
      <Shell className="gap-2">
        <div className="flex flex-col gap-4 min-w-0">
          {/* Header Section */}
          <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6 mb-4 min-w-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center flex-wrap gap-4">
              {/* Title and Earnings */}
              <div>
                <h1 className="text-2xl title-header font-bold text-black flex items-center gap-2">
                  Transaction History
                  {isFetching && (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  )}
                </h1>
                <div
                  className={cn(
                    "mt-2 flex items-center gap-2 transition-opacity duration-200",
                    isFetching && "opacity-50"
                  )}
                >
                  <span className="text-sm text-muted-foreground">
                    Earnings:
                  </span>
                  <span className="text-lg font-bold text-green-600">
                    £{parseFloat(earnings).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Filters Section */}
              <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto">
                <div className="flex flex-1 gap-3 items-center w-full sm:w-auto">
                  {/* Booking Date */}
                  <div className="flex flex-col gap-1.5">
                    <Input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full sm:w-[180px]"
                      disabled={isFetching}
                    />
                  </div>

                  {/* Status Filter */}
                  <div className="flex flex-col gap-1.5">
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                      disabled={isFetching}
                    >
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Search */}
                  <div className="flex flex-col gap-1.5">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="TXN ID / Booking Num..."
                        value={globalFilterValue}
                        onChange={(e) => setGlobalFilterValue(e.target.value)}
                        className="pl-8 w-full sm:w-[220px]"
                      />
                    </div>
                  </div>
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetAllFilters}
                      disabled={isFetching}
                      className="gap-2 shrink-0"
                      aria-label="Reset all filters"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset all
                    </Button>
                  )}
                </div>

                {/* Export Button */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="event-primary"
                    onClick={handleCSVExport}
                    className="w-full sm:w-auto"
                    disabled={isFetching}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Table Section */}
          {isLoading ? (
            <TransactionsTableSkeleton />
          ) : (
            <div className="relative">
              {/* Subtle loading overlay for refetch */}
              {isFetching && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Updating...</span>
                  </div>
                </div>
              )}
              <TransactionsDataTable
                search={searchParams}
                onEarningsUpdate={handleEarningsUpdate}
              />
            </div>
          )}
        </div>
      </Shell>
    </section>
  );
}
