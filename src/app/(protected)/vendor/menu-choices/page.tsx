"use client";

import { Shell } from "@/components/shell";
import React, { useState } from "react";
import CustomerMenuDataTable from "./_components/customer-menu-data-table";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function Page() {
  const [globalFilterValue, setGlobalFilterValue] = useState("");

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

  return (
    <section className="page">
      <Shell className="gap-2">
        {/* Header Card */}
        <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6 mb-4">
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

            {/* Search Filter */}
            <div className="flex items-center w-full sm:w-auto">
              <div className="relative w-full sm:w-[300px]">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by event, email, phone..."
                  value={globalFilterValue}
                  onChange={(e) => setGlobalFilterValue(e.target.value)}
                  className="pl-8 w-full"
                />
              </div>
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
          <CustomerMenuDataTable search={menuSearch} />
        </Suspense>
      </Shell>
    </section>
  );
}
