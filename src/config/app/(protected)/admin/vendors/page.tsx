"use client";

import React, { useState } from "react";
import { Shell } from "@/components/shell";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/data-table/use-debounce";
import { useQueryState, parseAsInteger } from "nuqs";
import { VendorsTable } from "./_components/vendors-table";
import { useAdminVenues } from "./_lib/use-admin-venues";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import type { AdminVenueListStatus } from "@/services/admin/venues/type";

export default function AdminVendorsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminVenueListStatus>("all");
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [per_page, setPerPage] = useQueryState(
    "per_page",
    parseAsInteger.withDefault(30)
  );

  const debouncedSearch = useDebounce(search, 300);

  const {
    data: vendors,
    totalVenues,
    meta,
    isLoading,
    isError,
    error,
  } = useAdminVenues({
    status: statusFilter,
    search: debouncedSearch,
    page: page ?? 1,
    per_page: per_page ?? 30,
  });

  const pageCount = meta?.last_page ?? 1;

  const handlePaginationChange = (newPageIndex: number, newPageSize: number) => {
    setPage(newPageIndex + 1);
    setPerPage(newPageSize);
  };

  return (
    <section className="page text-black min-w-0">
      <Shell className="gap-4">
        <div className="flex flex-col gap-6 min-w-0">
          {/* ── Page Header ── */}
          <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6 min-w-0">
            <div className="mb-5">
              <h1 className="text-2xl title-header font-bold">All Venues</h1>
            </div>

            {/* Filters toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v as AdminVenueListStatus);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Venues" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Venues</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search venues..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Total count from API */}
            <p className="mt-4 text-sm font-medium text-muted-foreground">
              Total Venues:{" "}
              <span className="inline-flex items-center justify-center bg-slate-100 text-foreground font-semibold rounded-md px-2 py-0.5 text-xs ml-1">
                {totalVenues}
              </span>
            </p>
          </div>

          {/* ── Venues Table ── */}
          {isLoading && !vendors.length ? (
            <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6 min-w-0">
              <DataTableSkeleton
                columnCount={10}
                rowCount={10}
                filterCount={0}
                withViewOptions={false}
                withPagination={true}
              />
            </div>
          ) : isError ? (
            <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6 text-center">
              <p className="text-destructive">
                Failed to load venues:{" "}
                {error instanceof Error ? error.message : "Unknown error"}
              </p>
            </div>
          ) : (
            <VendorsTable
              vendors={vendors}
              searchQuery={debouncedSearch}
              statusFilter={statusFilter}
              pageCount={pageCount}
              pageIndex={(page ?? 1) - 1}
              pageSize={per_page ?? 30}
              onPaginationChange={handlePaginationChange}
            />
          )}
        </div>
      </Shell>
    </section>
  );
}
