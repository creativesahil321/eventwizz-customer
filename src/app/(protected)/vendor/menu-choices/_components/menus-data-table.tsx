"use client";

import { DataTableFilterField } from "@/types";
import { useDataTable } from "@/hooks/data-table/use-data-table";
import React, { useMemo, useCallback, useState } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { getColumns } from "./columns";
import { useAdminMenuChoices } from "../_lib/queries";
import { TableToolbarActions } from "./table-toolbar-actions";
import { DataTableRowAction, MenuChoice, SearchParams } from "../_lib/types";
import { DataTableToolbar } from "./data-table-toolbar";
import { toSentenceCase } from "@/lib/utils";
import dynamic from "next/dynamic";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TableRow, TableCell } from "@/components/ui/table";
import { MenuChoicesTableSkeleton } from "./skeleton-loader";

const CreateMenuDialog = dynamic(() => import("./_menu-create"), {
  ssr: false,
});
const UpdateMenuDialog = dynamic(() => import("./_menu-update"), {
  ssr: false,
});
const DeleteMenuDialog = dynamic(() => import("./_menu-delete"), {
  ssr: false,
});

const dynamicStatusFilter = [
  { id: 12, title: "Active Events", value: "active", count: 22 },
  { id: 13, title: "Pending Events", value: "pending", count: 22 },
  { id: 14, title: "Draft Events", value: "draft", count: 22 },
];

type MenuChoiceDataTableProps = {
  initialData: MenuChoice[];
  search: SearchParams;
};

function MenuChoicesDataTable({
  initialData,
  search,
}: MenuChoiceDataTableProps) {
  const [rowAction, setRowAction] =
    useState<DataTableRowAction<MenuChoice> | null>(null);

  const {
    data: menus,
    isError,
    error,
    isLoading,
  } = useAdminMenuChoices(search);
  const adminMenus = useMemo(() => {
    if (menus?.data?.data && Array.isArray(menus.data.data)) {
      return menus.data.data || [];
    }
    return initialData || [];
  }, [menus?.data, initialData]);
  const columns = useMemo(() => getColumns({ setRowAction }), [setRowAction]);

  const filterFields = useMemo<DataTableFilterField<MenuChoice>[]>(
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
    (originalRow: MenuChoice) => String(originalRow?.id || ""),
    []
  );

  const { table } = useDataTable({
    data: adminMenus,
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
      <div className="text-red-500">
        Error loading menus: {error?.message || "Unknown error"}
      </div>
    );
  }

  if (isLoading) {
    return <MenuChoicesTableSkeleton className="animate-pulse" />;
  }

  return (
    <section className="w-full min-w-0 relative">
      <div className="w-full min-w-0 overflow-x-auto">
        <DataTable
          table={table}
          className="min-w-0"
          emptyStateRenderer={() => (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center"
              >
                No menu choices found. Try adjusting your filters.
              </TableCell>
            </TableRow>
          )}
        >
          <DataTableToolbar
            className="bg-background p-6 mb-4 w-full min-w-0"
            table={table}
            filterFields={filterFields}
            title="Menu Choices"
          >
            <TableToolbarActions table={table} />
            <CreateMenuDialog />
          </DataTableToolbar>
        </DataTable>
      </div>

      {rowAction?.type === "update" && (
        <UpdateMenuDialog
          open
          onOpenChange={() => setRowAction(null)}
          menu={rowAction?.row?.original}
        />
      )}
      {rowAction?.type === "delete" && (
        <DeleteMenuDialog
          open
          onOpenChange={() => setRowAction(null)}
          menu={rowAction?.row?.original}
        />
      )}
    </section>
  );
}

export default React.memo(MenuChoicesDataTable);
