"use client";

import { Shell } from "@/components/shell";
import React, { useState, useRef } from "react";
import CustomerMenuDataTable, {
  CustomerMenuDataTableRef,
} from "./_components/customer-menu-data-table";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { Input } from "@/components/ui/input";
import { Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportTableToCSV } from "@/lib/export";
import { toast } from "sonner";

export default function Page() {
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const tableRef = useRef<CustomerMenuDataTableRef>(null);

  // Get search params using client-side hook
  const searchParams = useSearchParams();

  // Parse search params into proper object
  const parsedParams = Object.fromEntries(searchParams.entries());

  // Set defaults
  const menuSearch = {
    page: parsedParams.page || "1",
    per_page: parsedParams.per_page || "30",
    search: globalFilterValue,
  };

  // Handle CSV export for all data
  const handleCSVExport = () => {
    if (tableRef.current?.table) {
      exportTableToCSV(tableRef.current.table, {
        filename: "customer-menu-choices",
        excludeColumns: ["actions"],
      });
      toast.success("CSV exported successfully");
    } else {
      toast.error("Table not ready. Please try again.");
    }
  };

  return (
    <section className="page overflow-x-auto">
      <Shell className="gap-2 overflow-visible">
        {/* Header Card */}
        <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6 mb-4 min-w-fit">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center flex-wrap gap-4">
            {/* Title */}
            <div>
              <h1 className="text-2xl title-header font-bold text-black">
                Customer Menu Choices
              </h1>
              <p className="text-muted-foreground mt-2">
                View and manage all customer menu choices.
              </p>
            </div>

            {/* Search Filter and CSV Button */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-[300px]">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by event, email, phone..."
                  value={globalFilterValue}
                  onChange={(e) => setGlobalFilterValue(e.target.value)}
                  className="pl-8 w-full"
                />
              </div>
              <Button
                variant="event-primary"
                onClick={handleCSVExport}
                className="flex items-center gap-2 shrink-0"
              >
                <Download className="h-4 w-4" />
                CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <Suspense
          fallback={
            <DataTableSkeleton
              columnCount={7}
              cellWidths={[
                "4rem",
                "12rem",
                "12rem",
                "16rem",
                "12rem",
                "10rem",
                "6rem",
              ]}
              shrinkZero
            />
          }
        >
          <CustomerMenuDataTable ref={tableRef} search={menuSearch} />
        </Suspense>
      </Shell>
    </section>
  );
}
