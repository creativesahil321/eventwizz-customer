"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, Mail, Loader2 } from "lucide-react";
import Link from "next/link";
import CustomerDataTable from "./_components/customer-data-table";
import dynamic from "next/dynamic";
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
import { CustomersPageSkeleton } from "./_components/skeleton-loader";
import { Suspense } from "react";
import { useCustomers } from "./_lib/queries";
import { useDebounce } from "@/hooks/data-table/use-debounce";

// Dynamic import of the customer create dialog
const CreateCustomerDialog = dynamic(
  () =>
    import("./_components/_customer-create").then(
      (mod) => mod.CreateCustomerDialog
    ),
  {
    ssr: false,
  }
);

// Simple wrapper component for the dialog
function CreateCustomerButton() {
  return <CreateCustomerDialog />;
}

export default function CustomersPage() {
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const tableRef = React.useRef<unknown>(null);

  // Debounce search input using existing hook
  const debouncedSearch = useDebounce(globalFilterValue, 500);

  // Default search params
  const searchParams: SearchParams = {
    page: 1,
    per_page: 30,
    search: debouncedSearch,
    status: statusFilter === "all" ? "" : statusFilter,
  };

  // Fetch data to track loading state
  const { isLoading, isFetching } = useCustomers(searchParams, undefined);

  // Handle CSV export
  const handleCSVExport = () => {
    if (tableRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      exportTableToCSV(tableRef.current as any, {
        filename: "vendor-customers",
        excludeColumns: ["select", "actions"],
      });
    }
  };

  return (
    <section className="page text-black overflow-x-auto">
      <Shell className="gap-0 overflow-visible">
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6 mb-0 min-w-fit">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center flex-wrap gap-4">
              <div>
                <h1 className="text-2xl title-header font-bold flex items-center gap-2">
                  Customers
                  {isFetching && (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  )}
                </h1>
                <p className="text-muted-foreground mt-2">
                  Manage your customers. View, edit, and communicate with your
                  customer base.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <div className="flex flex-1 gap-3 items-center">
                  <div className="relative flex-1 sm:min-w-[240px]">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search customers..."
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
                      <SelectItem value="all">All Customers</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="delete">Deleted</SelectItem>
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
                  <Link href="/vendor/send-email-to-all">
                    <Button variant="outline" size="sm">
                      <Mail className="mr-2 h-4 w-4" />
                      Bulk Mail
                    </Button>
                  </Link>
                  <CreateCustomerButton />
                </div>
              </div>
            </div>
          </div>

          {isLoading ? (
            <CustomersPageSkeleton />
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
              <Suspense fallback={<CustomersPageSkeleton />}>
                <CustomerDataTable
                  search={searchParams}
                  tableRef={tableRef}
                  currentFilter={statusFilter}
                />
              </Suspense>
            </div>
          )}
        </div>
      </Shell>
    </section>
  );
}
