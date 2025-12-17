"use client";

import { ColumnDef, Row } from "@tanstack/react-table";
import { DataTableRowAction, MenuChoice } from "../_lib/types";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Pencil, Trash, Loader2 } from "lucide-react";
import React, { useState, useCallback } from "react";
import { useUpdateMenuChoiceStatus } from "../_lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import SwitchControl from "./switch-control";

interface StatusCellProps {
  row: Row<MenuChoice>;
}

// StatusCell component to properly handle status toggle
function StatusCell({ row }: StatusCellProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const updateStatusMutation = useUpdateMenuChoiceStatus();
  const queryClient = useQueryClient();

  // Track the actual status from the server response
  const status = row.getValue("status");
  const isActive = status === "active" || status === 1;

  const handleToggle = useCallback(
    async (checked: boolean) => {
      const id = row.original.id;
      if (!id) {
        console.error("Row id is undefined or null");
        return;
      }

      // Start loading state
      setIsUpdating(true);

      try {
        // Call the mutation
        const response = await updateStatusMutation.mutateAsync({
          id,
          status: checked,
        });

        // If successful, update the row data with the server response
        if (response.status) {
          // Force a refetch of the data to ensure UI is in sync with server
          await queryClient.invalidateQueries({
            queryKey: ["menu-choices", "list"],
            exact: false,
          });

          // Directly update the row value to match the desired state
          // This ensures the toggle reflects the actual state
          row.original.status = checked ? 1 : 0;
        }
      } catch (error) {
        console.error("Failed to update status:", error);
      } finally {
        setIsUpdating(false);
      }
    },
    [row, updateStatusMutation, queryClient]
  );

  if (isUpdating) {
    return (
      <div className="flex items-center">
        <Loader2 className="h-4 w-4 mr-2 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Updating...</span>
      </div>
    );
  }

  return <SwitchControl checked={isActive} handleToggle={handleToggle} />;
}

interface GetColumnsProps {
  setRowAction: React.Dispatch<
    React.SetStateAction<DataTableRowAction<MenuChoice> | null>
  >;
}

export function getColumns({
  setRowAction,
}: GetColumnsProps): ColumnDef<MenuChoice>[] {
  return [
    {
      id: "sno",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="S.No"
        />
      ),
      cell: ({ row }) => {
        return <span>{row.index + 1}</span>;
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "event_name",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Event Name"
        />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("event_name")}</span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "menu_name",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Menu Name"
        />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("menu_name")}</span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "category",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Category"
        />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("category")}</span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Status"
        />
      ),
      cell: ({ row }) => <StatusCell row={row} />,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Submitted On"
        />
      ),
      cell: ({ row }) => {
        const createdAt = row.getValue("created_at") as string;

        // If it's already formatted as DD-MM-YYYY, just display it
        if (
          typeof createdAt === "string" &&
          /^\d{2}-\d{2}-\d{4}$/.test(createdAt)
        ) {
          return <span className="text-foreground">{createdAt}</span>;
        }

        // Try to parse the date properly
        const date = new Date(createdAt);

        if (isNaN(date.getTime())) {
          // Alternative parsing for DD-MM-YYYY format
          if (typeof createdAt === "string") {
            const [day, month, year] = createdAt.split("-").map(Number);
            if (day && month && year) {
              const parsedDate = new Date(year, month - 1, day);
              if (!isNaN(parsedDate.getTime())) {
                const formattedDate = `${String(parsedDate.getDate()).padStart(
                  2,
                  "0"
                )}-${String(parsedDate.getMonth() + 1).padStart(
                  2,
                  "0"
                )}-${parsedDate.getFullYear()}`;
                return <span className="text-foreground">{formattedDate}</span>;
              }
            }
          }
          return (
            <span className="text-foreground">
              {createdAt || "Invalid Date"}
            </span>
          );
        }

        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        const formattedDate = `${day}-${month}-${year}`;

        return <span className="text-foreground">{formattedDate}</span>;
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "actions",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Action"
        />
      ),
      cell: ({ row }) => {
        return (
          <nav className="flex space-x-3">
            <Button
              onClick={() => setRowAction({ row, type: "update" })}
              variant="event-primary"
              size="sm"
            >
              <Pencil size={16} />
            </Button>
            <Button
              onClick={() => setRowAction({ row, type: "delete" })}
              variant="event-outline"
              size="sm"
            >
              <Trash size={16} />
            </Button>
          </nav>
        );
      },
      size: 40,
      enableSorting: false,
      enableHiding: false,
      enablePinning: false,
    },
    {
      accessorKey: "event_type",
      header: () => null,
      cell: () => null,
      enableSorting: false,
      enableHiding: true,
    },
  ];
}
