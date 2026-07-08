"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Search, Download, Loader2, RotateCcw, Building2 } from "lucide-react";
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
import {
  useVendorTransactions,
  useExportAllReceiptsCSV,
} from "./_lib/queries";
import { cn } from "@/lib/utils";
import { TransactionsTableSkeleton } from "./_components/skeleton-loader";
import { useDebounce } from "@/hooks/data-table/use-debounce";
import { LocationIndicator } from "@/components/location-indicator";
import { PermissionRoute } from "@/components/permission";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format, startOfYear, endOfDay } from "date-fns";
import { useQueryState, parseAsInteger } from "nuqs";
import { useCurrencyFormat } from "@/hooks/use-currency-format";

export default function TransactionsPage() {
  const { format: formatMoney } = useCurrencyFormat();
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roomFilter, setRoomFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [earnings, setEarnings] = useState("0.00");
  const [, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  const debouncedSearch = useDebounce(globalFilterValue, 500);

  const fromDate = dateRange?.from
    ? format(dateRange.from, "yyyy-MM-dd")
    : undefined;
  const toDate = dateRange?.to
    ? format(dateRange.to, "yyyy-MM-dd")
    : undefined;

  const selectedRoomId = roomFilter === "all" ? undefined : roomFilter;

  const { data: transactionsData, isLoading, isFetching } = useVendorTransactions({
    search: debouncedSearch,
    status: statusFilter === "all" ? "" : statusFilter,
    from_date: fromDate,
    to_date: toDate,
    room_id: selectedRoomId,
    page: 1,
    per_page: 30,
  });

  const filterMeta = transactionsData?.filter_meta;
  const availableRooms = React.useMemo(
    () => filterMeta?.available_rooms ?? [],
    [filterMeta?.available_rooms],
  );
  const showRoomFilter =
    !!fromDate &&
    filterMeta?.has_room_bookings === true &&
    availableRooms.length > 0;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, fromDate, toDate, statusFilter, roomFilter, setPage]);

  useEffect(() => {
    if (!fromDate) {
      if (roomFilter !== "all") setRoomFilter("all");
      return;
    }

    if (roomFilter === "all") return;

    const isValidSelection = availableRooms.some(
      (room) => String(room.room_id) === roomFilter,
    );
    if (!isValidSelection) {
      setRoomFilter("all");
    }
  }, [fromDate, availableRooms, roomFilter]);

  const hasActiveFilters =
    !!debouncedSearch ||
    statusFilter !== "all" ||
    roomFilter !== "all" ||
    !!dateRange?.from ||
    !!dateRange?.to;

  const handleResetAllFilters = () => {
    setGlobalFilterValue("");
    setStatusFilter("all");
    setRoomFilter("all");
    setDateRange(undefined);
    setPage(1);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    setRoomFilter("all");
  };

  const searchParams: SearchParams = {
    page: "1",
    per_page: "30",
    search: debouncedSearch,
    status: statusFilter === "all" ? "" : statusFilter,
    from_date: fromDate,
    to_date: toDate,
    room_id: selectedRoomId,
  };

  const exportCSVMutation = useExportAllReceiptsCSV();

  const handleEarningsUpdate = useCallback((earningsValue: string) => {
    setEarnings(earningsValue);
  }, []);

  const handleCSVExport = () => {
    const from = fromDate ?? format(startOfYear(new Date()), "yyyy-MM-dd");
    const to = toDate ?? format(endOfDay(new Date()), "yyyy-MM-dd");
    exportCSVMutation.mutate({ from, to });
  };

  return (
    <PermissionRoute
      permissionKey="read-transaction"
      fallbackPath="/vendor/dashboard"
    >
      <section className="page text-black min-w-0 max-w-full overflow-x-hidden">
        <Shell className="gap-2 overflow-x-hidden">
        <div className="flex flex-col gap-4 min-w-0 max-w-full">
          {/* Header Section */}
          <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-4 sm:p-6 mb-4 min-w-0 max-w-full overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center flex-wrap gap-4 min-w-0">
              {/* Title and Earnings */}
              <div className="min-w-0 flex flex-col gap-3">
                <h1 className="text-xl sm:text-2xl title-header font-bold text-black flex items-center gap-2 break-words">
                  Transaction History
                  {isFetching && (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  )}
                </h1>
                <LocationIndicator variant="card" />
                <div
                  className={cn(
                    "flex items-center gap-2 transition-opacity duration-200",
                    isFetching && "opacity-50"
                  )}
                >
                  <span className="text-sm text-muted-foreground">
                    Earnings:
                  </span>
                  <span className="text-lg font-bold text-green-600">
                    {formatMoney(parseFloat(earnings))}
                  </span>
                </div>
              </div>

              {/* Filters Section */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full min-w-0 sm:w-auto max-w-full">
                <div className="flex flex-col sm:flex-row flex-1 gap-3 items-stretch sm:items-center w-full min-w-0 sm:w-auto flex-wrap">
                  {/* Date Range */}
                  <div className="w-full min-w-0 sm:w-auto sm:min-w-[280px] relative">
                    <DateRangePicker
                      date={dateRange}
                      onDateChange={handleDateRangeChange}
                      placeholder="Filter by date range"
                      disabled={isFetching}
                      showClear={true}
                    />
                    {isFetching && !dateRange?.from && (
                      <div className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary)]" />
                      </div>
                    )}
                  </div>

                  {showRoomFilter && (
                    <Select
                      value={roomFilter}
                      onValueChange={setRoomFilter}
                      disabled={isFetching}
                    >
                      <SelectTrigger className="w-full min-w-0 sm:w-[200px]">
                        <div className="flex items-center gap-2 truncate">
                          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <SelectValue placeholder="All halls" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All halls</SelectItem>
                        {availableRooms.map((room) => (
                          <SelectItem
                            key={room.room_id}
                            value={String(room.room_id)}
                          >
                            {room.room_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Status Filter */}
                  <div className="flex flex-col gap-1.5 min-w-0 max-w-full">
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                      disabled={isFetching}
                    >
                      <SelectTrigger className="w-full max-w-full min-w-0 sm:w-[180px]">
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
                  <div className="flex flex-col gap-1.5 min-w-0 max-w-full">
                    <div className="relative w-full max-w-full min-w-0">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground shrink-0" />
                      <Input
                        placeholder="TXN ID / Booking Num..."
                        value={globalFilterValue}
                        onChange={(e) => setGlobalFilterValue(e.target.value)}
                        className="pl-8 w-full max-w-full min-w-0 sm:w-[220px]"
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
                    disabled={isFetching || exportCSVMutation.isPending}
                  >
                    {exportCSVMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
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
    </PermissionRoute>
  );
}
