"use client";
import React, { useMemo } from "react";
import { getColumns } from "./columns";
import { Customer, DataTableRowAction, SearchParams } from "../_lib/types";
import { useDataTable } from "@/hooks/data-table/use-data-table";
import { DataTable } from "@/components/data-table/data-table";
import { useQueryState, parseAsInteger } from "nuqs";

const DeleteCustomerDialog = dynamic(
  () => import("./_customer-delete").then((mod) => mod.DeleteCustomerDialog),
  { ssr: false }
);
const RestoreCustomerDialog = dynamic(
  () => import("./_customer-restore").then((mod) => mod.RestoreCustomerDialog),
  { ssr: false }
);
const MailCustomerDialog = dynamic(
  () => import("./_customer-mail").then((mod) => mod.MailCustomerDialog),
  { ssr: false }
);
const UpdateCustomerDialog = dynamic(
  () => import("./_customer-update").then((mod) => mod.UpdateCustomerDialog),
  { ssr: false }
);

import dynamic from "next/dynamic";
import { useCustomers } from "../_lib/queries";
import { DataTableFilterField } from "@/hooks/data-table/use-data-table";
import { CustomersTableSkeleton } from "./skeleton-loader";
type CustomersDataTableProps = {
  search: SearchParams;
  tableRef?: React.RefObject<unknown>;
  currentFilter?: string;
};
export default function CustomerDataTable({
  search,
  tableRef,
  currentFilter = "all",
}: CustomersDataTableProps) {
  const [rowAction, setRowAction] =
    React.useState<DataTableRowAction<Customer> | null>(null);
  const getColumn = React.useCallback(
    () => getColumns({ setRowAction, currentFilter }),
    [setRowAction, currentFilter]
  );
  const columns = React.useMemo(() => getColumn(), [getColumn]);

  // Read page and per_page from URL (same as booking history / locations) so pagination triggers refetch
  const [page] = useQueryState("page", parseAsInteger.withDefault(1));
  const [per_page] = useQueryState("per_page", parseAsInteger.withDefault(30));

  // Build query params: URL for pagination, search prop for filters
  const queryParams = useMemo(
    () => ({
      page: page ?? 1,
      per_page: per_page ?? 30,
      search: typeof search.search === "string" ? search.search : "",
      status: typeof search.status === "string" ? search.status : "",
    }),
    [page, per_page, search.search, search.status]
  );

  const { data: customers, isLoading } = useCustomers(queryParams, undefined);

  const vendorCustomers = React.useMemo(
    () => customers?.data ?? [],
    [customers?.data]
  );
  const filterFields: DataTableFilterField<Customer>[] = React.useMemo(
    () => [],
    []
  );

  const { table } = useDataTable({
    data: vendorCustomers,
    columns: columns || [],
    pageCount: customers?.meta?.last_page || 1,
    filterFields: filterFields,
    enableAdvancedFilter: false,
    enableClientSideSorting: true,
    initialState: {
      sorting: [{ id: "created_at", desc: true }],
    },
    getRowId: (originalRow) => String(originalRow?.id || ""),
    shallow: false,
    clearOnDefault: true,
  });

  // Assign table to ref for CSV export
  React.useEffect(() => {
    if (tableRef) {
      tableRef.current = table;
    }
  }, [table, tableRef]);

  if (isLoading) {
    return <CustomersTableSkeleton className="animate-pulse" />;
  }

  return (
    <>
      <DataTable table={table} />
      {rowAction?.type === "delete" && (
        <>
          <DeleteCustomerDialog
            open={rowAction?.type === "delete"}
            onOpenChange={() => setRowAction(null)}
            showTrigger={false}
            customer={rowAction?.row?.original ? rowAction?.row.original : null}
            onSuccess={() => rowAction?.row?.toggleSelected(false)}
          />
        </>
      )}
      {rowAction?.type === "edit" && (
        <>
          <UpdateCustomerDialog
            open={rowAction?.type === "edit"}
            onOpenChange={() => {
              setRowAction(null);
            }}
            customer={
              rowAction?.row?.original ? rowAction?.row?.original : null
            }
            showTrigger={false}
            onSuccess={() => rowAction?.row?.toggleSelected(false)}
          />
        </>
      )}
      {rowAction?.type === "mail" && (
        <>
          <MailCustomerDialog
            open={rowAction?.type === "mail"}
            onOpenChange={() => setRowAction(null)}
            customer={rowAction?.row?.original ? rowAction?.row.original : null}
            showTrigger={false}
            onSuccess={() => rowAction?.row.toggleSelected(false)}
          />
        </>
      )}
      {rowAction?.type === "restore" && (
        <>
          <RestoreCustomerDialog
            open={rowAction?.type === "restore"}
            onOpenChange={() => setRowAction(null)}
            customer={rowAction?.row?.original ? rowAction?.row.original : null}
            showTrigger={false}
            onSuccess={() => rowAction?.row.toggleSelected(false)}
          />
        </>
      )}
    </>
  );
}
