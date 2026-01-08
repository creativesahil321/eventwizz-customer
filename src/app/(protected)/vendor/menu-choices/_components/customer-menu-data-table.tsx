"use client";

import {
  useMemo,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import { DataTable } from "@/components/data-table/data-table";
import { useDataTable } from "@/hooks/data-table/use-data-table";
import { getCustomerMenuColumns } from "./customer-menu-columns";
import { CustomerMenuChoice } from "../_lib/customer-menu-types";
import { dummyCustomerMenuChoices } from "../_lib/dummy-data";
import type { Table } from "@tanstack/react-table";

interface CustomerMenuDataTableProps {
  search?: {
    page?: string;
    per_page?: string;
    search?: string;
  };
}

export interface CustomerMenuDataTableRef {
  table: Table<CustomerMenuChoice> | null;
}

const CustomerMenuDataTable = forwardRef<
  CustomerMenuDataTableRef,
  CustomerMenuDataTableProps
>(({ search = {} }, ref) => {
  const [data, setData] = useState<CustomerMenuChoice[]>(
    dummyCustomerMenuChoices
  );
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Handle delete action
  const handleDelete = useCallback((id: string) => {
    setData((prev) => prev.filter((item) => item.id !== id));
    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const isDeleting = useCallback(
    (id: string) => deletingIds.has(id),
    [deletingIds]
  );

  const columns = useMemo(
    () => getCustomerMenuColumns({ onDelete: handleDelete, isDeleting }),
    [handleDelete, isDeleting]
  );

  // Filter data based on global search
  const filteredData = useMemo(() => {
    if (!search?.search || search.search.trim() === "") {
      return data;
    }

    const searchTerm = search.search.toLowerCase().trim();
    return data.filter((item) => {
      return (
        item.event_name.toLowerCase().includes(searchTerm) ||
        item.customer_email.toLowerCase().includes(searchTerm) ||
        item.customer_phone.toLowerCase().includes(searchTerm) ||
        item.event_date.toLowerCase().includes(searchTerm) ||
        item.status.toLowerCase().includes(searchTerm)
      );
    });
  }, [data, search?.search]);

  const pageCount = useMemo(
    () => Number(search?.per_page) || 30,
    [search?.per_page]
  );

  const getRowId = useCallback(
    (originalRow: CustomerMenuChoice) => originalRow.id,
    []
  );

  const { table } = useDataTable({
    data: filteredData,
    columns,
    pageCount,
    enableAdvancedFilter: false,
    enableClientSideSorting: true,
    initialState: {
      sorting: [{ id: "event_date", desc: false }],
      columnPinning: { right: ["actions"] },
    },
    getRowId,
  });

  // Expose table via ref
  useImperativeHandle(ref, () => ({
    table,
  }));

  return <DataTable table={table} />;
});

CustomerMenuDataTable.displayName = "CustomerMenuDataTable";

export default CustomerMenuDataTable;
