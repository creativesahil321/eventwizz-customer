"use client";

import React, { useState, useEffect } from "react";
import type { Table } from "@tanstack/react-table";
import {
  Search,
  DollarSign,
  Clock,
  Receipt,
  Loader2,
  Tag,
  RotateCcw,
} from "lucide-react";
import HistoryDataTable from "./_components/history-data-table";
import { Shell } from "@/components/shell";
import { SearchParams } from "./_lib/types";
import { History } from "./_lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Suspense } from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { useHistory } from "./_lib/queries";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/data-table/use-debounce";
import { useQueryState, parseAsInteger } from "nuqs";
import { TableToolbarActions } from "./_components/table-toolbar-actions";
import { LocationIndicator } from "@/components/location-indicator";
import { PermissionRoute } from "@/components/permission";

export default function BookingHistoryPage() {
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [, setSelectedRowCount] = useState(0);
  const tableRef = React.useRef<Table<History> | null>(null);
  const [, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  const fromDate = dateRange?.from
    ? format(dateRange.from, "yyyy-MM-dd")
    : undefined;
  const toDate = dateRange?.to
    ? format(dateRange.to, "yyyy-MM-dd")
    : undefined;

  useEffect(() => {
    const updateSelectedCount = () => {
      if (tableRef.current) {
        const count =
          tableRef.current.getFilteredSelectedRowModel().rows.length;
        setSelectedRowCount(count);
      }
    };
    updateSelectedCount();
    const interval = setInterval(updateSelectedCount, 200);
    return () => clearInterval(interval);
  }, []);

  const debouncedSearch = useDebounce(globalFilterValue, 500);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, fromDate, toDate, setPage]);

  const hasActiveFilters =
    !!debouncedSearch || statusFilter !== "all" || !!dateRange?.from || !!dateRange?.to;

  const handleResetAllFilters = () => {
    setGlobalFilterValue("");
    setStatusFilter("all");
    setDateRange(undefined);
    setPage(1);
  };

  const searchParams: SearchParams = {
    page: "1",
    per_page: "30",
    search: debouncedSearch,
    status: statusFilter === "all" ? "" : statusFilter,
    from_date: fromDate,
    to_date: toDate,
  };

  const {
    data: historyData,
    isLoading,
    isFetching,
  } = useHistory({
    search: debouncedSearch,
    page: 1,
    per_page: 30,
    status: statusFilter === "all" ? "" : statusFilter,
    from_date: fromDate,
    to_date: toDate,
  });

  // Get summary from API response
  const summaryTotals = React.useMemo(() => {
    if (historyData?.summary) {
      return {
        totalAmount: parseFloat(historyData.summary.total_amount) || 0,
        totalDeposit: parseFloat(historyData.summary.deposit_amount) || 0,
        totalPending: parseFloat(historyData.summary.pending_amount) || 0,
        totalPlatformFee:
          parseFloat(historyData.summary.total_platform_fee || "0") || 0,
      };
    }
    // Fallback: calculate from data if summary not available
    const bookings = historyData?.data || [];
    const totalAmount = bookings.reduce((sum, booking) => {
      const amount =
        typeof booking.amount === "string"
          ? parseFloat(booking.amount) || 0
          : booking.amount || 0;
      return sum + amount;
    }, 0);
    const totalDeposit = bookings.reduce((sum, booking) => {
      const deposit =
        typeof booking.deposit_amount === "string"
          ? parseFloat(booking.deposit_amount) || 0
          : booking.deposit_amount || 0;
      return sum + deposit;
    }, 0);
    const totalPending = bookings.reduce((sum, booking) => {
      const pending =
        typeof booking.pending_amount === "string"
          ? parseFloat(booking.pending_amount) || 0
          : booking.pending_amount || 0;
      return sum + pending;
    }, 0);
    const totalPlatformFee = bookings.reduce((sum, booking) => {
      const platformFee =
        typeof booking.platform_fee === "string"
          ? parseFloat(booking.platform_fee) || 0
          : booking.platform_fee || 0;
      return sum + platformFee;
    }, 0);
    return { totalAmount, totalDeposit, totalPending, totalPlatformFee };
  }, [historyData?.summary, historyData?.data]);

  return (
    <PermissionRoute
      permissionKey="read-booking"
      fallbackPath="/vendor/dashboard"
    >
      <section className="page text-black min-w-0">
        <Shell className="gap-2">
          <div className="flex flex-col gap-4 min-w-0">
            <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6 mb-4 min-w-0">
              <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center flex-wrap gap-4">
                <div className="flex flex-col gap-3">
                  <h1 className="text-2xl title-header font-bold text-black flex items-center gap-2">
                    Booking History
                    {isFetching && (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    )}
                  </h1>
                  <LocationIndicator variant="card" context="Bookings" />
                  <p className="text-muted-foreground">
                    View and manage all booking transactions. Filter by status
                    and track booking details.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-center w-full sm:w-auto min-w-0">
                  <div className="flex flex-wrap gap-3 items-center w-full sm:min-w-0 sm:max-w-full min-w-0">
                    {/* Date range filter - same as Email Logs */}
                    <div className="w-full min-w-0 sm:w-auto sm:min-w-[280px]">
                      <DateRangePicker
                        date={dateRange}
                        onDateChange={setDateRange}
                        placeholder="Filter by date range"
                        disabled={isFetching}
                        showClear={true}
                      />
                    </div>
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px] sm:min-w-[180px] max-w-full">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search bookings..."
                        value={globalFilterValue}
                        onChange={(e) => setGlobalFilterValue(e.target.value)}
                        className="pl-8 w-full"
                        disabled={isFetching}
                      />
                    </div>
                    {/* Status Filter */}
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                      disabled={isFetching}
                    >
                      <SelectTrigger className="w-full sm:w-[180px] shrink-0 min-w-[140px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Bookings</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="pending">Pending (Draft)</SelectItem>
                        <SelectItem value="partially_paid">
                          Partially Paid
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {/* Reset all filters - visible when any filter is active */}
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
                  <div className="flex items-center gap-2 shrink-0 flex-shrink-0">
                    {tableRef.current && (
                      <TableToolbarActions table={tableRef.current} />
                    )}
                  </div>
                </div>
              </div>

              {/* Summary Section */}
              <div
                className={cn(
                  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-[var(--color-border)] transition-opacity duration-200",
                  isFetching && "opacity-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                    <Receipt className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">
                      Total Amount
                    </p>
                    <p className="text-lg font-bold text-blue-600">
                      £{summaryTotals.totalAmount.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">
                      Total Deposit Amount
                    </p>
                    <p className="text-lg font-bold text-green-600">
                      £{summaryTotals.totalDeposit.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                    <Tag className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">
                      Total Platform Fee
                    </p>
                    <p className="text-lg font-bold text-purple-600">
                      £{summaryTotals.totalPlatformFee.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">
                      Total Pending Amount
                    </p>
                    <p className="text-lg font-bold text-orange-600">
                      £{summaryTotals.totalPending.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Show skeleton on initial load */}
          {isLoading ? (
            <DataTableSkeleton
              columnCount={8}
              cellWidths={[
                "10rem",
                "40rem",
                "12rem",
                "12rem",
                "8rem",
                "8rem",
                "8rem",
                "8rem",
              ]}
              shrinkZero
            />
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
              <Suspense
                fallback={
                  <DataTableSkeleton
                    columnCount={8}
                    cellWidths={[
                      "10rem",
                      "40rem",
                      "12rem",
                      "12rem",
                      "8rem",
                      "8rem",
                      "8rem",
                      "8rem",
                    ]}
                    shrinkZero
                  />
                }
              >
                <HistoryDataTable search={searchParams} tableRef={tableRef} />
              </Suspense>
            </div>
          )}
        </div>
      </Shell>
    </section>
    </PermissionRoute>
  );
}
