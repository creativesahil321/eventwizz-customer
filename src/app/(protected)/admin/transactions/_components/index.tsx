"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Search, Download, Loader2, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { useDebounce } from "@/hooks/data-table/use-debounce";
import { AdminTransactionsDataTable } from "./transactions-data-table";
import { AdminTransactionsTableSkeleton } from "./skeleton-loader";
import {
  getDummyEarnings,
  getFilteredDummyTransactions,
  DUMMY_TRANSACTIONS,
} from "../_lib/dummy-data";
import type { SearchParams } from "../_lib/types";
import type { Transaction } from "../_lib/types";

export default function Transactions() {
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [earnings, setEarnings] = useState(() =>
    getDummyEarnings(DUMMY_TRANSACTIONS)
  );
  const [isLoading, setIsLoading] = useState(true);

  const debouncedSearch = useDebounce(globalFilterValue, 500);

  const fromDate = dateRange?.from
    ? format(dateRange.from, "yyyy-MM-dd")
    : undefined;
  const toDate = dateRange?.to
    ? format(dateRange.to, "yyyy-MM-dd")
    : undefined;

  const searchParams: SearchParams = {
    page: "1",
    per_page: "30",
    search: debouncedSearch,
    status: statusFilter === "all" ? "" : statusFilter,
    from_date: fromDate,
    to_date: toDate,
  };

  const handleEarningsUpdate = useCallback((earningsValue: string) => {
    setEarnings(earningsValue);
  }, []);

  const hasActiveFilters =
    !!debouncedSearch ||
    statusFilter !== "all" ||
    !!dateRange?.from ||
    !!dateRange?.to;

  const handleResetAllFilters = () => {
    setGlobalFilterValue("");
    setStatusFilter("all");
    setDateRange(undefined);
  };

  const handleCSVExport = () => {
    const filtered = getFilteredDummyTransactions({
      search: debouncedSearch,
      status: statusFilter === "all" ? "" : statusFilter,
      from_date: fromDate,
      to_date: toDate,
    });
    const headers = [
      "Booking Number",
      "Txn ID",
      "Booking Date",
      "Event Date",
      "Full Name",
      "Email",
      "Payment Method",
      "Status",
      "Amount",
      "Platform Fee",
    ];
    const rows = filtered.map((t) =>
      [
        t.booking_number,
        t.transaction_id,
        t.booking_date,
        t.event_date,
        t.full_name,
        t.email,
        `${t.card_brand} **${t.cardLast4}`,
        t.status,
        t.amount,
        t.platform_fee,
      ].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-transaction-history-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col gap-4 min-w-0 max-w-full">
      <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-4 sm:p-6 min-w-0">
        <div className="flex flex-col gap-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl title-header font-bold text-black">
                Transaction History
              </h1>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Earnings:
                </span>
                <span className="text-lg font-bold text-green-600">
                  £{earnings}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full min-w-0 sm:w-auto flex-wrap">
              <div className="w-full min-w-0 sm:w-auto sm:min-w-[280px]">
                <DateRangePicker
                  date={dateRange}
                  onDateChange={setDateRange}
                  placeholder="Booking Date"
                  showClear
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
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
              <div className="relative w-full sm:w-[220px]">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Txn ID / Booking Num..."
                  value={globalFilterValue}
                  onChange={(e) => setGlobalFilterValue(e.target.value)}
                  className="pl-8 w-full"
                />
              </div>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetAllFilters}
                  className="gap-2 shrink-0"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset all
                </Button>
              )}
              <Button
                variant="event-primary"
                onClick={handleCSVExport}
                className="gap-2 shrink-0"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <AdminTransactionsTableSkeleton rowCount={9} />
      ) : (
        <AdminTransactionsDataTable
          search={searchParams}
          onEarningsUpdate={handleEarningsUpdate}
        />
      )}
    </div>
  );
}
