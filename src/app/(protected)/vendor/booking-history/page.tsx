"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, DollarSign, Clock, Receipt, Loader2 } from "lucide-react";
import HistoryDataTable from "./_components/history-data-table";
import { Shell } from "@/components/shell";
import { SearchParams } from "./_lib/types";
import { Input } from "@/components/ui/input";
import { exportTableToCSV } from "@/lib/export";
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

export default function BookingHistoryPage() {
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const tableRef = React.useRef<unknown>(null);

  // Debounce search input using existing hook
  const debouncedSearch = useDebounce(globalFilterValue, 500);

  // Build search params based on current filters
  const searchParams: SearchParams = {
    page: "1",
    per_page: "30",
    search: debouncedSearch,
    status: statusFilter === "all" ? "" : statusFilter,
  };

  // Fetch data for summary (use the same query as the table)
  const {
    data: historyData,
    isLoading,
    isFetching,
  } = useHistory({
    search: debouncedSearch,
    page: 1,
    per_page: 30,
    status: statusFilter === "all" ? "" : statusFilter,
  });

  // Get summary from API response
  const summaryTotals = React.useMemo(() => {
    if (historyData?.summary) {
      return {
        totalAmount: parseFloat(historyData.summary.total_amount) || 0,
        totalDeposit: parseFloat(historyData.summary.deposit_amount) || 0,
        totalPending: parseFloat(historyData.summary.pending_amount) || 0,
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
    return { totalAmount, totalDeposit, totalPending };
  }, [historyData?.summary, historyData?.data]);

  // Handle CSV export
  const handleCSVExport = () => {
    if (tableRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      exportTableToCSV(tableRef.current as any, {
        filename: "booking-history",
        excludeColumns: ["select", "actions"],
      });
    }
  };

  return (
    <section className="page">
      <Shell className="gap-2">
        <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6 mb-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center flex-wrap gap-4">
              <div>
                <h1 className="text-2xl title-header font-bold text-black flex items-center gap-2">
                  Booking History
                  {isFetching && (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  )}
                </h1>
                <p className="text-muted-foreground mt-2">
                  View and manage all booking transactions. Filter by status and
                  track booking details.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto">
                <div className="flex flex-1 gap-3 items-center w-full sm:w-auto">
                  <div className="relative flex-1 sm:min-w-[240px]">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search bookings..."
                      value={globalFilterValue}
                      onChange={(e) => setGlobalFilterValue(e.target.value)}
                      className="pl-8 w-full"
                    />
                  </div>
                  <Select
                    value={statusFilter}
                    onValueChange={setStatusFilter}
                    disabled={isFetching}
                  >
                    <SelectTrigger className="w-[180px]">
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
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="event-primary"
                    onClick={handleCSVExport}
                    disabled={isFetching}
                  >
                    CSV
                  </Button>
                </div>
              </div>
            </div>

            {/* Summary Section */}
            <div
              className={cn(
                "grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[var(--color-border)] transition-opacity duration-200",
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
      </Shell>
    </section>
  );
}
