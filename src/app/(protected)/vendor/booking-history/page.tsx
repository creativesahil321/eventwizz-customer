"use client";

import React, { useState, useEffect } from "react";
import type { Table } from "@tanstack/react-table";
import {
  Search,
  PoundSterling,
  Clock,
  Receipt,
  Loader2,
  Tag,
  RotateCcw,
  Wallet,
  Building2,
  QrCode,
} from "lucide-react";
import Link from "next/link";
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
import { LocationScopedTitle } from "@/components/location-indicator";
import { PermissionRoute } from "@/components/permission";
import { useCurrencyFormat } from "@/hooks/use-currency-format";

export default function BookingHistoryPage() {
  const { format: formatMoney } = useCurrencyFormat();
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roomFilter, setRoomFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [, setSelectedRowCount] = useState(0);
  const tableRef = React.useRef<Table<History> | null>(null);
  const [, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  const fromDate = dateRange?.from
    ? format(dateRange.from, "yyyy-MM-dd")
    : undefined;
  const toDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined;

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
  }, [debouncedSearch, statusFilter, roomFilter, fromDate, toDate, setPage]);

  const selectedRoomId = roomFilter === "all" ? undefined : roomFilter;

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
    room_id: selectedRoomId,
  });

  const filterMeta = historyData?.filter_meta;
  const availableRooms = React.useMemo(
    () => filterMeta?.available_rooms ?? [],
    [filterMeta?.available_rooms],
  );
  const showRoomFilter =
    !!fromDate &&
    filterMeta?.has_room_bookings === true &&
    availableRooms.length > 0;

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

  const summaryTotals = React.useMemo(() => {
    if (historyData?.summary) {
      return {
        totalAmount: parseFloat(historyData.summary.total_amount) || 0,
        totalDeposit: parseFloat(historyData.summary.deposit_amount) || 0,
        totalPending: parseFloat(historyData.summary.pending_amount) || 0,
        totalPlatformFee:
          parseFloat(historyData.summary.total_platform_fee || "0") || 0,
        refundedAmount:
          parseFloat(historyData.summary.refunded_amount || "0") || 0,
        platformFeeDue:
          parseFloat(historyData.summary.platform_fee_due || "0") || 0,
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
    return {
      totalAmount,
      totalDeposit,
      totalPending,
      totalPlatformFee,
      refundedAmount: 0,
      platformFeeDue: 0,
    };
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
                      <LocationScopedTitle title="Booking History" />
                      {isFetching && (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      )}
                    </h1>
                    <p className="text-muted-foreground">
                      Bookings for this venue. Switch location in the header to
                      view another. Filter by status to track details.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-center w-full sm:w-auto min-w-0">
                    <div className="flex flex-wrap gap-3 items-center w-full sm:min-w-0 sm:max-w-full min-w-0">
                      <Button asChild variant="outline" className="shrink-0">
                        <Link href="/vendor/door-scan">
                          <QrCode className="h-4 w-4" />
                          Door scan
                        </Link>
                      </Button>
                      {/* Date range filter - same as Email Logs */}
                      <div className="w-full min-w-0 sm:w-auto sm:min-w-[280px]">
                        <DateRangePicker
                          date={dateRange}
                          onDateChange={handleDateRangeChange}
                          placeholder="Filter by date range"
                          disabled={isFetching}
                          showClear={true}
                          disableFutureDates={false}
                        />
                      </div>
                      {showRoomFilter && (
                        <Select
                          value={roomFilter}
                          onValueChange={setRoomFilter}
                          disabled={isFetching}
                        >
                          <SelectTrigger className="w-full sm:w-[200px] shrink-0 min-w-[160px]">
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
                    "grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pt-4 border-t border-[var(--color-border)] transition-opacity duration-200",
                    isFetching && "opacity-50",
                  )}
                >
                  {[
                    {
                      label: "Total Amount",
                      value: summaryTotals.totalAmount,
                      icon: Receipt,
                      iconBg: "bg-blue-500/10",
                      iconColor: "text-blue-600",
                      valueColor: "text-blue-600",
                    },
                    {
                      label: "Total Deposit",
                      value: summaryTotals.totalDeposit,
                      icon: PoundSterling,
                      iconBg: "bg-emerald-500/10",
                      iconColor: "text-emerald-600",
                      valueColor: "text-emerald-600",
                    },
                    {
                      label: "Platform Fee",
                      value: summaryTotals.totalPlatformFee,
                      icon: Tag,
                      iconBg: "bg-violet-500/10",
                      iconColor: "text-violet-600",
                      valueColor: "text-violet-600",
                    },
                    {
                      label: "Pending Amount",
                      value: summaryTotals.totalPending,
                      icon: Clock,
                      iconBg: "bg-amber-500/10",
                      iconColor: "text-amber-600",
                      valueColor: "text-amber-600",
                    },
                    {
                      label: "Refunded Amount",
                      value: summaryTotals.refundedAmount,
                      icon: RotateCcw,
                      iconBg: "bg-rose-500/10",
                      iconColor: "text-rose-600",
                      valueColor: "text-rose-600",
                    },
                    {
                      label: "Platform Fee Due",
                      value: summaryTotals.platformFeeDue,
                      icon: Wallet,
                      iconBg: "bg-cyan-500/10",
                      iconColor: "text-cyan-600",
                      valueColor: "text-cyan-600",
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-3 sm:p-4 min-h-[72px]"
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                          stat.iconBg,
                          stat.iconColor,
                        )}
                      >
                        <stat.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-muted-foreground">
                          {stat.label}
                        </p>
                        <p
                          className={cn(
                            "truncate text-base font-semibold tabular-nums sm:text-lg",
                            stat.valueColor,
                          )}
                        >
                          {formatMoney(stat.value)}
                        </p>
                      </div>
                    </div>
                  ))}
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
