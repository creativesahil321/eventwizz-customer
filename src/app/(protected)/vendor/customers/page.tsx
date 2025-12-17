"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, Mail } from "lucide-react";
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

  // Default search params
  const searchParams: SearchParams = {
    page: 1,
    per_page: 30,
    search: globalFilterValue,
    status: statusFilter === "all" ? "" : statusFilter,
  };

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
    <section className="page text-black">
      <Shell className="gap-0">
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6 mb-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center flex-wrap gap-4">
              <div>
                <h1 className="text-2xl title-header font-bold">Customers</h1>
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
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                  <Button variant="event-primary" onClick={handleCSVExport}>
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

          <Suspense fallback={<CustomersPageSkeleton />}>
            <CustomerDataTable
              search={searchParams}
              tableRef={tableRef}
              currentFilter={statusFilter}
            />
          </Suspense>
        </div>
      </Shell>
    </section>
  );
}
