"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Search, Download } from "lucide-react";
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

export default function TransactionsPage() {
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bookingDate, setBookingDate] = useState("");
  const [earnings, setEarnings] = useState("0.00");

  // Build search params based on current filters
  const searchParams: SearchParams = {
    page: "1",
    per_page: "30",
    search: globalFilterValue,
    status: statusFilter === "all" ? "" : statusFilter,
    from: bookingDate,
  };

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
    <section className="page">
      <Shell className="gap-2">
        {/* Header Section */}
        <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6 mb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center flex-wrap gap-4">
            {/* Title and Earnings */}
            <div>
              <h1 className="text-2xl title-header font-bold text-black">
                Transaction History
              </h1>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Earnings:</span>
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
                  />
                </div>

                {/* Status Filter */}
                <div className="flex flex-col gap-1.5">
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
              </div>

              {/* Export Button */}
              <div className="flex items-center gap-2">
                <Button
                  variant="event-primary"
                  onClick={handleCSVExport}
                  className="w-full sm:w-auto"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <TransactionsDataTable
          search={searchParams}
          onEarningsUpdate={handleEarningsUpdate}
        />
      </Shell>
    </section>
  );
}
