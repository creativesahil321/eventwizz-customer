"use client";

import { useMemo, useCallback, useImperativeHandle, forwardRef } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { useDataTable } from "@/hooks/data-table/use-data-table";
import { getCustomerMenuColumns } from "./customer-menu-columns";
import { CustomerMenuChoice } from "../_lib/customer-menu-types";
import type { Table } from "@tanstack/react-table";
import { useCustomerMenuChoicesList } from "../_lib/queries";
import { useQueryState, parseAsInteger } from "nuqs";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import type { CustomerMenuChoiceListItem } from "@/services/vendor/menu_choices/type";

interface CustomerMenuSearchParams {
  page?: number;
  per_page?: number;
  search?: string;
  event_id?: number;
  event_date?: string;
  event_name?: string;
  room_id?: number | string;
}

interface CustomerMenuDataTableProps {
  search?: CustomerMenuSearchParams;
}

export interface CustomerMenuDataTableRef {
  table: Table<CustomerMenuChoice> | null;
}

function mapApiItemToRow(item: CustomerMenuChoiceListItem): CustomerMenuChoice {
  return {
    id: String(item.id),
    event_name: item.event_name,
    event_date: item.event_date,
    event_date_raw: item.event_date_raw,
    customer_name: item.customer_name,
    customer_email: item.customer_email,
    customer_phone: item.customer_phone ?? "",
    status: item.status,
    booking_id: item.booking_id,
    booking_date_id: item.booking_date_id,
    date_key: item.event_date_raw,
  };
}

const CustomerMenuDataTable = forwardRef<
  CustomerMenuDataTableRef,
  CustomerMenuDataTableProps
>(({ search = {} }, ref) => {
  const [page] = useQueryState("page", parseAsInteger.withDefault(1));
  const [per_page] = useQueryState("per_page", parseAsInteger.withDefault(30));

  const queryParams = {
    search: typeof search?.search === "string" ? search.search : "",
    page: page ?? 1,
    per_page: per_page ?? 30,
    event_id: search?.event_id,
    event_date: search?.event_date,
    event_name: search?.event_name,
    room_id: search?.room_id,
  };

  const {
    data: response,
    isLoading,
    isError,
  } = useCustomerMenuChoicesList(queryParams);

  const rows = useMemo(() => {
    const list = response?.data ?? [];
    return list.map(mapApiItemToRow);
  }, [response?.data]);

  const pageCount = useMemo(
    () => response?.meta?.last_page ?? 1,
    [response?.meta?.last_page]
  );

  const getRowId = useCallback(
    (originalRow: CustomerMenuChoice) => originalRow.id,
    []
  );

  const columns = useMemo(() => getCustomerMenuColumns(), []);

  const { table } = useDataTable({
    data: rows,
    columns,
    pageCount,
    enableAdvancedFilter: false,
    enableClientSideSorting: true,
    initialState: {
      sorting: [{ id: "event_date", desc: false }],
      columnPinning: { right: ["actions"] },
    },
    getRowId,
    shallow: false,
    clearOnDefault: true,
  });

  useImperativeHandle(ref, () => ({
    table,
  }));

  if (isLoading) {
    return (
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
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6">
        <div className="text-red-500">
          Error loading customer menu choices. Please try again later.
        </div>
      </div>
    );
  }

  return <DataTable table={table} />;
});

CustomerMenuDataTable.displayName = "CustomerMenuDataTable";

export default CustomerMenuDataTable;
