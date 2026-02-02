"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Search,
  Mail,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  MoreHorizontal,
  Trash2,
  RotateCcw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  useCustomers,
  useBulkActivateCustomers,
  useBulkDeactivateCustomers,
  useBulkDeleteCustomers,
  useBulkRestoreCustomers,
} from "./_lib/queries";
import { useDebounce } from "@/hooks/data-table/use-debounce";
import { useQueryState, parseAsInteger } from "nuqs";
import { toast } from "sonner";
import type { Table } from "@tanstack/react-table";
import { Customer } from "./_lib/types";

// Dynamic import of the customer create dialog
const CreateCustomerDialog = dynamic(
  () =>
    import("./_components/_customer-create").then(
      (mod) => mod.CreateCustomerDialog,
    ),
  {
    ssr: false,
  },
);

// Simple wrapper component for the dialog
function CreateCustomerButton() {
  return <CreateCustomerDialog />;
}

export default function CustomersPage() {
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRowCount, setSelectedRowCount] = useState(0);
  const tableRef = React.useRef<Table<Customer> | null>(null);

  // Debounce search input using existing hook
  const debouncedSearch = useDebounce(globalFilterValue, 500);
  const [, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  // Reset page to 1 when search or status filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, setPage]);

  // Search params for loading state (data table reads page/per_page from URL)
  const searchParams: SearchParams = {
    page: 1,
    per_page: 30,
    search: debouncedSearch,
    status: statusFilter === "all" ? "" : statusFilter,
  };

  // Fetch data to track loading state
  const { isLoading, isFetching } = useCustomers(searchParams, undefined);

  // Bulk operations mutations
  const bulkActivateMutation = useBulkActivateCustomers();
  const bulkDeactivateMutation = useBulkDeactivateCustomers();
  const bulkDeleteMutation = useBulkDeleteCustomers();
  const bulkRestoreMutation = useBulkRestoreCustomers();

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

  // Handle CSV export
  const handleCSVExport = () => {
    if (tableRef.current) {
      exportTableToCSV(tableRef.current, {
        filename: "vendor-customers",
        excludeColumns: ["select", "actions"],
      });
    }
  };

  // Get selected customer IDs from table
  const getSelectedCustomerIds = (): (number | string)[] => {
    if (!tableRef.current) {
      return [];
    }
    const selectedRows = tableRef.current.getFilteredSelectedRowModel().rows;
    return selectedRows.map((row) => {
      const customer = row.original as Customer;
      return customer.id;
    });
  };

  // Get selected customers data
  const getSelectedCustomers = (): Customer[] => {
    if (!tableRef.current) {
      return [];
    }
    const selectedRows = tableRef.current.getFilteredSelectedRowModel().rows;
    return selectedRows.map((row) => row.original as Customer);
  };

  // Check if all selected customers are deleted
  const areAllSelectedCustomersDeleted = (): boolean => {
    const selectedCustomers = getSelectedCustomers();
    if (selectedCustomers.length === 0) return false;

    // If viewing deleted filter, all customers shown are deleted
    if (statusFilter === "delete") {
      return true;
    }

    // Check if all selected customers have deleted_at set
    return selectedCustomers.every(
      (customer) =>
        customer.deleted_at !== null && customer.deleted_at !== undefined,
    );
  };

  // Check if all selected customers have status "active"
  const areAllSelectedCustomersStatusActive = (): boolean => {
    const selectedCustomers = getSelectedCustomers();
    if (selectedCustomers.length === 0) return false;
    return selectedCustomers.every((customer) => customer.status === "active");
  };

  // Check if all selected customers have status "inactive"
  const areAllSelectedCustomersStatusInactive = (): boolean => {
    const selectedCustomers = getSelectedCustomers();
    if (selectedCustomers.length === 0) return false;
    return selectedCustomers.every(
      (customer) => customer.status === "inactive",
    );
  };

  // Handle bulk activate
  const handleBulkActivate = async () => {
    const selectedIds = getSelectedCustomerIds();

    if (selectedIds.length === 0) {
      toast.error("Please select at least one customer to activate");
      return;
    }

    try {
      await bulkActivateMutation.mutateAsync(selectedIds);
      // Clear selection after successful activation
      if (tableRef.current) {
        tableRef.current.resetRowSelection();
      }
    } catch (error) {
      // Error is already handled by the mutation and API interceptor
      console.error("Error activating customers:", error);
    }
  };

  // Handle bulk deactivate
  const handleBulkDeactivate = async () => {
    const selectedIds = getSelectedCustomerIds();

    if (selectedIds.length === 0) {
      toast.error("Please select at least one customer to deactivate");
      return;
    }

    try {
      await bulkDeactivateMutation.mutateAsync(selectedIds);
      // Clear selection after successful deactivation
      if (tableRef.current) {
        tableRef.current.resetRowSelection();
      }
    } catch (error) {
      // Error is already handled by the mutation and API interceptor
      console.error("Error deactivating customers:", error);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    const selectedIds = getSelectedCustomerIds();

    if (selectedIds.length === 0) {
      toast.error("Please select at least one customer to delete");
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
      console.error("Error deleting customers:", error);
    }
  };

  // Handle bulk restore
  const handleBulkRestore = async () => {
    const selectedIds = getSelectedCustomerIds();

    if (selectedIds.length === 0) {
      toast.error("Please select at least one customer to restore");
      return;
    }

    try {
      await bulkRestoreMutation.mutateAsync(selectedIds);
      // Clear selection after successful restore
      if (tableRef.current) {
        tableRef.current.resetRowSelection();
      }
    } catch (error) {
      // Error is already handled by the mutation and API interceptor
      console.error("Error restoring customers:", error);
    }
  };

  const isBulkOperationLoading =
    bulkActivateMutation.isPending ||
    bulkDeactivateMutation.isPending ||
    bulkDeleteMutation.isPending ||
    bulkRestoreMutation.isPending;

  const hasSelectedRows = selectedRowCount > 0;

  return (
    <section className="page text-black min-w-0">
      <Shell className="gap-2">
        <div className="flex flex-col gap-4 min-w-0">
          <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6 mb-4 min-w-0">
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
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Hide CSV and Bulk Mail when rows are selected to avoid confusion */}
                  {!hasSelectedRows && (
                    <>
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
                    </>
                  )}

                  {/* Professional Bulk Actions Dropdown - Only shows when rows are selected */}
                  {hasSelectedRows && (
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
                        {/* When viewing deleted customers, only show Restore option */}
                        {statusFilter === "delete" ? (
                          <DropdownMenuItem
                            onClick={handleBulkRestore}
                            disabled={bulkRestoreMutation.isPending}
                            className="cursor-pointer focus:bg-green-50 focus:text-green-700 dark:focus:bg-green-900/20 dark:focus:text-green-400"
                          >
                            {bulkRestoreMutation.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" />
                            )}
                            <span>Restore Selected</span>
                            <span className="ml-auto text-xs text-muted-foreground">
                              {selectedRowCount}{" "}
                              {selectedRowCount === 1
                                ? "customer"
                                : "customers"}
                            </span>
                          </DropdownMenuItem>
                        ) : (
                          <>
                            {/* Activate Selected - Only show if not all are already active */}
                            {!areAllSelectedCustomersStatusActive() && (
                              <DropdownMenuItem
                                onClick={handleBulkActivate}
                                disabled={bulkActivateMutation.isPending}
                                className="cursor-pointer focus:bg-green-50 focus:text-green-700"
                              >
                                {bulkActivateMutation.isPending ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                                )}
                                <span>Activate Selected</span>
                                <span className="ml-auto text-xs text-muted-foreground">
                                  {selectedRowCount}{" "}
                                  {selectedRowCount === 1
                                    ? "customer"
                                    : "customers"}
                                </span>
                              </DropdownMenuItem>
                            )}

                            {/* Separator between Activate and Deactivate */}
                            {!areAllSelectedCustomersStatusActive() &&
                              !areAllSelectedCustomersStatusInactive() && (
                                <DropdownMenuSeparator />
                              )}

                            {/* Deactivate Selected - Only show if not all are already inactive */}
                            {!areAllSelectedCustomersStatusInactive() && (
                              <DropdownMenuItem
                                onClick={handleBulkDeactivate}
                                disabled={bulkDeactivateMutation.isPending}
                                className="cursor-pointer focus:bg-red-50 focus:text-red-700"
                              >
                                {bulkDeactivateMutation.isPending ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <XCircle className="mr-2 h-4 w-4 text-red-600" />
                                )}
                                <span>Deactivate Selected</span>
                                <span className="ml-auto text-xs text-muted-foreground">
                                  {selectedRowCount}{" "}
                                  {selectedRowCount === 1
                                    ? "customer"
                                    : "customers"}
                                </span>
                              </DropdownMenuItem>
                            )}

                            {/* Separator between Deactivate and Delete */}
                            {!areAllSelectedCustomersStatusInactive() &&
                              !areAllSelectedCustomersDeleted() && (
                                <DropdownMenuSeparator />
                              )}

                            {/* Delete Selected - Only show if not all are already deleted */}
                            {!areAllSelectedCustomersDeleted() && (
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
                                  {selectedRowCount === 1
                                    ? "customer"
                                    : "customers"}
                                </span>
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

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
