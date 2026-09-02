"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Loader2,
  Trash2,
  MoreHorizontal,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import { Shell } from "@/components/shell";
import { SearchParams } from "./_lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { useEmailLogs, useBulkDeleteEmailLogs } from "./_lib/queries";
import { useDebounce } from "@/hooks/data-table/use-debounce";
import EmailLogsDataTable from "./_components/email-data-table";
import { useQueryState, parseAsInteger } from "nuqs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Table } from "@tanstack/react-table";
import { EmailLog } from "./_lib/types";
import { toast } from "sonner";
import { PermissionGuard } from "@/components/permission/PermissionGuard";
import { PermissionRoute } from "@/components/permission";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { LocationScopedTitle } from "@/components/location-indicator";

export default function EmailLogsPage() {
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [selectedRowCount, setSelectedRowCount] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const tableRef = React.useRef<Table<EmailLog> | null>(null);
  const [, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  // Debounce search input using existing hook
  const debouncedSearch = useDebounce(globalFilterValue, 500);

  // Format date range for API
  const fromDate = dateRange?.from
    ? format(dateRange.from, "yyyy-MM-dd")
    : undefined;
  const toDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined;

  // Reset page to 1 when search or date range changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, fromDate, toDate, setPage]);

  const hasActiveFilters =
    !!debouncedSearch || !!dateRange?.from || !!dateRange?.to;

  const handleResetAllFilters = () => {
    setGlobalFilterValue("");
    setDateRange(undefined);
    setPage(1);
  };

  // Build search params based on current filters
  const searchParams: SearchParams = {
    page: "1",
    per_page: "30",
    search: debouncedSearch,
    from_date: fromDate,
    to_date: toDate,
  };

  // Fetch data for loading state
  const { isLoading, isFetching } = useEmailLogs({
    search: debouncedSearch,
    page: 1,
    per_page: 30,
    from_date: fromDate,
    to_date: toDate,
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useBulkDeleteEmailLogs();

  // Update selected row count when table selection changes
  React.useEffect(() => {
    const updateSelectedCount = () => {
      if (tableRef.current) {
        const count =
          tableRef.current.getFilteredSelectedRowModel().rows.length;
        setSelectedRowCount(count);
      }
    };

    // Initial update
    updateSelectedCount();

    // Poll for changes (since we don't have direct access to selection state)
    const interval = setInterval(updateSelectedCount, 200);

    return () => clearInterval(interval);
  }, [tableRef]);

  // Get selected email log IDs from table
  const getSelectedEmailLogIds = (): (number | string)[] => {
    if (!tableRef.current) {
      return [];
    }
    const selectedRows = tableRef.current.getFilteredSelectedRowModel().rows;
    return selectedRows.map((row) => {
      const emailLog = row.original as EmailLog;
      return emailLog.id;
    });
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    const selectedIds = getSelectedEmailLogIds();

    if (selectedIds.length === 0) {
      toast.error("Please select at least one email log to delete");
      return;
    }

    try {
      await bulkDeleteMutation.mutateAsync(selectedIds);
      // Clear selection after successful deletion
      if (tableRef.current) {
        tableRef.current.resetRowSelection();
      }
    } catch (error) {
      // Error is already handled by the mutation and API interceptor
      console.error("Error bulk deleting email logs:", error);
    }
  };

  const isBulkOperationLoading = bulkDeleteMutation.isPending;
  const hasSelectedRows = selectedRowCount > 0;

  // Show loading overlay only when fetching (not on initial load)
  const showLoadingOverlay = isFetching && !isLoading;

  return (
    <PermissionRoute
      permissionKey="read-email-log"
      fallbackPath="/vendor/dashboard"
    >
      <section className="page text-black min-w-0 max-w-full overflow-x-hidden pb-20 sm:pb-4">
        <Shell className="gap-2 overflow-x-hidden">
          <div className="flex flex-col gap-4 min-w-0 max-w-full">
            <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-4 sm:p-6 mb-4 min-w-0 max-w-full overflow-hidden">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center flex-wrap gap-4 min-w-0">
                  <div className="min-w-0 flex flex-col gap-3">
                    <h1 className="text-xl sm:text-2xl title-header font-bold text-black break-words">
                      <LocationScopedTitle title="Email Logs" />
                    </h1>
                    <p className="text-muted-foreground break-words">
                      Emails sent for this venue. Search by recipient or
                      subject.
                    </p>
                  </div>
                  <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:w-auto min-w-0 max-w-full">
                    {/* Search */}
                    <div className="relative w-full min-w-0 sm:min-w-[240px] sm:flex-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by email or subject..."
                        value={globalFilterValue}
                        onChange={(e) => setGlobalFilterValue(e.target.value)}
                        className="pl-8 w-full transition-opacity duration-200"
                        disabled={isFetching}
                      />
                      {isFetching && (
                        <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-[var(--color-primary)]" />
                      )}
                    </div>

                    {/* Date Range Picker */}
                    <div className="w-full min-w-0 sm:w-auto sm:min-w-[280px] relative">
                      <DateRangePicker
                        date={dateRange}
                        onDateChange={setDateRange}
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
                    {/* Professional Bulk Actions Dropdown - Only shows when rows are selected */}
                    {hasSelectedRows && (
                      <PermissionGuard permissionKey="delete-email-log">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isBulkOperationLoading || isFetching}
                              className="transition-all animate-in fade-in-0 slide-in-from-top-2 duration-200"
                            >
                              {isBulkOperationLoading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <MoreHorizontal className="mr-2 h-4 w-4" />
                                  Bulk Actions ({selectedRowCount})
                                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                                </>
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem
                              onClick={handleBulkDelete}
                              disabled={bulkDeleteMutation.isPending}
                              className="cursor-pointer focus:bg-red-50 focus:text-red-700"
                            >
                              {bulkDeleteMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                              )}
                              <span>Delete Selected</span>
                              <span className="ml-auto text-xs text-muted-foreground">
                                {selectedRowCount}{" "}
                                {selectedRowCount === 1 ? "log" : "logs"}
                              </span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </PermissionGuard>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Show skeleton on initial load */}
            {isLoading ? (
              <DataTableSkeleton
                columnCount={7}
                cellWidths={[
                  "10rem",
                  "40rem",
                  "12rem",
                  "10rem",
                  "15rem",
                  "20rem",
                  "10rem",
                ]}
                shrinkZero
              />
            ) : (
              <div className="relative">
                {/* Loading Overlay - Shows when filters are being applied */}
                {showLoadingOverlay && (
                  <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm rounded-lg border border-[var(--color-border)] flex items-center justify-center transition-all duration-300 animate-in fade-in-0">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
                      <p className="text-sm text-muted-foreground font-medium">
                        Applying filters...
                      </p>
                    </div>
                  </div>
                )}

                {/* Subtle loading indicator at top of table */}
                {showLoadingOverlay && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100/50 rounded-t-lg overflow-hidden z-40">
                    <div className="h-full bg-[var(--color-primary)] animate-loading" />
                  </div>
                )}

                <div
                  className={cn(
                    "transition-opacity duration-300",
                    showLoadingOverlay && "opacity-60",
                  )}
                >
                  <Suspense
                    fallback={
                      <DataTableSkeleton
                        columnCount={7}
                        cellWidths={[
                          "10rem",
                          "40rem",
                          "12rem",
                          "10rem",
                          "15rem",
                          "20rem",
                          "10rem",
                        ]}
                        shrinkZero
                      />
                    }
                  >
                    <EmailLogsDataTable
                      initialData={[]}
                      search={searchParams}
                      tableRef={tableRef}
                    />
                  </Suspense>
                </div>
              </div>
            )}
          </div>
        </Shell>
      </section>
    </PermissionRoute>
  );
}
