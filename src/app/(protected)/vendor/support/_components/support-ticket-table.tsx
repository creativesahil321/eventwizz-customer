"use client";

import { SearchParams } from "@/types";
import { DataTableRowAction, SupportTicket } from "./../_lib/types";
import { useCallback, useMemo, useState } from "react";
import { getSupportTicketColumns } from "./columns";
import { useDataTable } from "@/hooks/data-table/use-data-table";
import { useTickets } from "../_lib/queries";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "./data-table-toolbar";
import { CreateTicketDialog } from "./_support-ticket-create";

interface SupportTicketTableProps {
  initialData: SupportTicket[];
  search: SearchParams;
}

export default function SupportTicketTable({
  initialData,
  search,
}: SupportTicketTableProps) {
  const [rowAction, setRowAction] =
    useState<DataTableRowAction<SupportTicket> | null>(null);
  const columns = useMemo(() => getSupportTicketColumns({ setRowAction }), []);

  const { data: tickets, isError, error } = useTickets(search);
  const supportTickets = useMemo(
    () => tickets?.data?.data ?? initialData ?? [],
    [tickets?.data, initialData]
  );

  const pageCount = useMemo(
    () => Number(search?.per_page) || 20,
    [search?.per_page]
  );
  const getRowId = useCallback(
    (originalRow: SupportTicket) => String(originalRow?.id || ""),
    []
  );

  const { table } = useDataTable({
    data: supportTickets,
    columns,
    pageCount,
    filterFields: [],
    enableAdvancedFilter: false,
    initialState: {
      sorting: [{ id: "created_at", desc: true }],
      columnPinning: { right: ["actions"] },
    },
    getRowId,
    shallow: false,
    clearOnDefault: true,
  });

  if (isError) {
    return (
      <div>Error loading tickets: {error?.message || "Unknown error"}</div>
    );
  }

  return (
    <section className="w-full">
      <DataTable table={table}>
        <DataTableToolbar
          className="bg-background p-6 border rounded-lg"
          table={table}
          filterFields={[]}
        >
          <CreateTicketDialog />
        </DataTableToolbar>
      </DataTable>
    </section>
  );
}
