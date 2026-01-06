import { ColumnDef } from "@tanstack/react-table";
import { Customer, DataTableRowAction } from "../_lib/types";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Pencil,
  UserPlus,
  UserRoundX,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

// Map of status to CSS color variables
const STATUS_COLORS = {
  active: {
    bg: "var(--color-success)",
    text: "var(--color-text)",
  },
  draft: {
    bg: "var(--color-info)",
    text: "var(--color-text)",
  },
  pending: {
    bg: "var(--color-warning)",
    text: "var(--color-text)",
  },
  disable: {
    bg: "var(--color-muted)",
    text: "var(--color-foreground)",
  },
};

interface GetColumnsProps {
  setRowAction: React.Dispatch<
    React.SetStateAction<DataTableRowAction<Customer> | null>
  >;
  currentFilter?: string; // Add current filter state
}
export function getColumns({
  setRowAction,
  currentFilter = "all",
}: GetColumnsProps): ColumnDef<Customer>[] {
  return [
    {
      accessorKey: "first_name",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="First Name"
        />
      ),
      cell: ({ row }) => (
        <>
          <span className="font-medium">{row.getValue("first_name")}</span>
        </>
      ),
      enableSorting: true,
      enableHiding: false,
    },
    {
      accessorKey: "last_name",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Last Name"
        />
      ),
      cell: ({ row }) => (
        <>
          <span className="font-medium">{row.getValue("last_name")}</span>
        </>
      ),
      enableSorting: true,
      enableHiding: false,
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Email"
        />
      ),
      cell: ({ row }) => (
        <>
          <span className="text-foreground lowercase">
            {row.getValue("email")}
          </span>
        </>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "phone",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Phone"
        />
      ),
      cell: ({ row }) => (
        <>
          <span className="text-foreground">{row.getValue("phone")}</span>
        </>
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
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        if (!status) return null;

        // Get color configuration for this status or use default
        const colorConfig = STATUS_COLORS[
          status.toLowerCase() as keyof typeof STATUS_COLORS
        ] || {
          bg: "var(--color-muted-status)",
          text: "var(--color-foreground)",
        };

        return (
          <div
            className={`flex items-center justify-center w-[4rem] capitalize p-2 rounded-md`}
            style={{
              backgroundColor: colorConfig.bg,
              color: colorConfig.text,
            }}
          >
            <span>{status}</span>
          </div>
        );
      },
      filterFn: (row, id, value) => {
        return Array.isArray(value) && value.includes(row.getValue(id));
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Created At"
        />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.original.created_at)}
        </span>
      ),
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const dateA = new Date(rowA.getValue("created_at") as string).getTime();
        const dateB = new Date(rowB.getValue("created_at") as string).getTime();
        return dateA - dateB;
      },
    },
    {
      id: "actions",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Actions"
        />
      ),
      cell: function Cell({ row }) {
        const customer = row.original;

        // Check if we're viewing deleted customers based on the filter
        const isViewingDeleted = currentFilter === "delete";

        // Also check if customer has deleted_at field (for future API compatibility)
        const hasDeletedAt =
          customer.deleted_at !== null && customer.deleted_at !== undefined;

        if (isViewingDeleted || hasDeletedAt) {
          // Show restore and permanent delete buttons for deleted customers
          return (
            <>
              <nav className="flex space-x-3">
                <Button
                  onClick={() => setRowAction({ row, type: "restore" })}
                  variant="default"
                  title="Restore Customer"
                >
                  <RotateCcw size={16} />
                </Button>
                <Button
                  onClick={() =>
                    setRowAction({ row, type: "permanent-delete" })
                  }
                  variant="destructive"
                  title="Permanent Delete"
                >
                  <Trash2 size={16} />
                </Button>
              </nav>
            </>
          );
        }

        // Show regular action buttons for active customers
        return (
          <>
            <nav className="flex space-x-3">
              <Button
                onClick={() => setRowAction({ row, type: "login-as" })}
                variant="event-outline"
                title="Login as Customer"
              >
                <UserPlus size={16} />
              </Button>
              <Button
                onClick={() => setRowAction({ row, type: "edit" })}
                variant="event-outline"
                title="Edit Customer"
              >
                <Pencil size={16} />
              </Button>
              <Button
                onClick={() => setRowAction({ row, type: "mail" })}
                variant="event-outline"
                title="Send Mail"
              >
                <Mail size={16} />
              </Button>
              <Button
                onClick={() => setRowAction({ row, type: "delete" })}
                variant="destructive"
                title="Delete Customer"
              >
                <UserRoundX size={16} />
              </Button>
            </nav>
          </>
        );
      },
      size: 40,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
