"use client";

import React, { useState, useCallback } from "react";
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
import { format, startOfYear, endOfDay } from "date-fns";
import { useDebounce } from "@/hooks/data-table/use-debounce";
import { AdminTransactionsDataTable } from "./transactions-data-table";
import type { SearchParams } from "../_lib/types";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { useExportAdminTransactions } from "@/services/admin/transactions";
import { toast } from "sonner";

export default function Transactions() {
  const { formatLocale } = useCurrencyFormat();
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [earnings, setEarnings] = useState("0");

  const debouncedSearch = useDebounce(globalFilterValue, 500);
  const exportMutation = useExportAdminTransactions();

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
    // Always send a date range to the API (same pattern as vendor transactions).
    const from = fromDate ?? format(startOfYear(new Date()), "yyyy-MM-dd");
    const to = toDate ?? format(endOfDay(new Date()), "yyyy-MM-dd");

    if (!from || !to) {
      toast.error("Please select a date range to export");
      return;
    }

    exportMutation.mutate({
      from_date: from,
      to_date: to,
      search: debouncedSearch || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
    });
  };

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
                  {formatLocale(parseFloat(earnings) || 0)}
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
                disabled={exportMutation.isPending}
                aria-busy={exportMutation.isPending}
                className="gap-2 shrink-0"
              >
                {exportMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {exportMutation.isPending ? "Exporting…" : "Export CSV"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AdminTransactionsDataTable
        search={searchParams}
        onEarningsUpdate={handleEarningsUpdate}
      />
    </div>
  );
}
