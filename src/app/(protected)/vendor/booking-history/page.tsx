"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
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

export default function BookingHistoryPage() {
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const tableRef = React.useRef<unknown>(null);

  // Build search params based on current filters
  const searchParams: SearchParams = {
    page: "1",
    per_page: "30",
    search: globalFilterValue,
    status: statusFilter === "all" ? "" : statusFilter,
  };

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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center flex-wrap gap-4">
            <div>
              <h1 className="text-2xl title-header font-bold text-black">
                Booking History
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
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Bookings</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="event-primary" onClick={handleCSVExport}>
                  CSV
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Suspense
          fallback={
            <DataTableSkeleton
              columnCount={6}
              cellWidths={["10rem", "40rem", "12rem", "12rem", "8rem", "8rem"]}
              shrinkZero
            />
          }
        >
          <HistoryDataTable
            search={searchParams}
            tableRef={tableRef}
            currentFilter={statusFilter}
          />
        </Suspense>
      </Shell>
    </section>
  );
}
