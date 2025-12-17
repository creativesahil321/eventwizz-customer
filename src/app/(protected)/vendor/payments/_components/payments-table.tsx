"use client";
import { DataTableFilterField } from "@/types";
import { useDataTable } from "@/hooks/data-table/use-data-table";
import React, { useMemo, useCallback } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { toSentenceCase } from "@/lib/utils";
import { DataTableRowAction, Payment, SearchParams } from "../_lib/types";
import { getColumns } from "./columns";
import { usePayments } from "../_lib/queries";
import { DataTableToolbar } from "./data-table-toolbar";
import { UpdatePaymentDialog } from "./_payment-update";
import DeletePaymentDialog from "./_payment-delete";
import { CreatePaymentDialog } from "./_payment-create";

// Define your dynamic status filter array
const dynamicStatusFilter = [
  { id: 12, title: "Active Events", value: "active", count: 22 },
  { id: 13, title: "Pending Events", value: "pending", count: 22 },
  { id: 14, title: "Draft Events", value: "draft", count: 22 },
];

type PaymentsDataTableProps = {
  initialData: Payment[];
  search: SearchParams;
};

function PaymentsTable({ initialData, search }: PaymentsDataTableProps) {
  const [rowAction, setRowAction] =
    React.useState<DataTableRowAction<Payment> | null>(null);

  const columns = useMemo(() => getColumns({ setRowAction }), [setRowAction]);
  const { data: payments, isError, error } = usePayments(search);
  const paymentsData = useMemo(
    () => payments?.data?.data ?? initialData ?? [],
    [payments?.data, initialData]
  );

  const filterFields = useMemo<DataTableFilterField<Payment>[]>(
    () => [
      {
        id: "menu_name",
        label: "Menu Name",
        placeholder: "Menu name",
      },
      {
        id: "event_type",
        label: "Event Type",
        type: "dropdown",
        options: dynamicStatusFilter.map((option) => ({
          label: toSentenceCase(option.title),
          value: option.value,
          icon: undefined,
          count: option.count,
        })),
      },
    ],
    []
  );

  const pageCount = useMemo(
    () => Number(search?.perPage) || 20,
    [search?.perPage]
  );
  const getRowId = useCallback(
    (originalRow: Payment) => String(originalRow?.id || ""),
    []
  );

  const { table } = useDataTable({
    data: paymentsData,
    columns,
    pageCount,
    filterFields,
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
      <div>Error loading payments: {error?.message || "Unknown error"}</div>
    );
  }

  return (
    <section className="w-full min-w-0 relative">
      {paymentsData.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          No payments found. Try adjusting your filters.
        </div>
      ) : (
        <div className="w-full min-w-0 overflow-x-auto">
          <DataTable table={table} className="min-w-0">
            <DataTableToolbar
              className="bg-background p-6 mb-4 w-full min-w-0"
              table={table}
              filterFields={filterFields}
              title="Payments"
            >
              <CreatePaymentDialog />
            </DataTableToolbar>
          </DataTable>
        </div>
      )}
      {rowAction?.type === "update" && (
        <>
          <UpdatePaymentDialog
            open={rowAction?.type === "update"}
            onOpenChange={() => {
              setRowAction(null);
            }}
            payment={rowAction?.row?.original ? rowAction?.row?.original : null}
            showTrigger={false}
            onSuccess={() => rowAction?.row?.toggleSelected(false)}
          />
        </>
      )}
      {rowAction?.type === "delete" && (
        <DeletePaymentDialog
          open={rowAction?.type === "delete"}
          onOpenChange={() => {
            setRowAction(null);
          }}
          payment={rowAction?.row?.original ? rowAction?.row?.original : null}
          showTrigger={false}
          onSuccess={() => rowAction?.row?.toggleSelected(false)}
        />
      )}
    </section>
  );
}

export default React.memo(PaymentsTable);
