import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { SquarePen } from "lucide-react";
import React from "react";
import { DataTableRowAction, EmailTemplate } from "../_lib/types";
import { PermissionGuard } from "@/components/permission";

interface GetColumnsProps {
  setRowAction: React.Dispatch<
    React.SetStateAction<DataTableRowAction<EmailTemplate> | null>
  >;
}
export function getColumns({
  setRowAction,
}: GetColumnsProps): ColumnDef<EmailTemplate>[] {
  return [
    {
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Title"
        />
      ),
      cell: ({ row }) => (
        <span className="font-medium max-w-[180px] truncate block">
          {row.getValue("title")}
        </span>
      ),
      enableSorting: true,
      enableHiding: false,
    },
    {
      accessorKey: "who_received",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Who Received"
        />
      ),
      cell: ({ row }) => (
        <span className="font-medium capitalize hidden sm:table-cell">
          {String(row.getValue("who_received"))}
        </span>
      ),
      enableSorting: true,
      enableHiding: false,
      meta: {
        className: "hidden sm:table-cell",
      },
    },
    {
      accessorKey: "when_received",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="When Do They Received"
        />
      ),
      cell: ({ row }) => {
        return (
          <span className="font-medium max-w-[160px] truncate block hidden md:table-cell">
            {row.getValue("when_received")}
          </span>
        );
      },
      enableSorting: true,
      enableHiding: false,
      meta: {
        className: "hidden md:table-cell",
      },
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
        return (
          <span
            className={`font-medium capitalize hidden sm:inline-block ${
              status.toLowerCase() === "active"
                ? "text-success"
                : "text-destructive"
            }`}
          >
            {status}
          </span>
        );
      },
      enableSorting: true,
      enableHiding: false,
      meta: {
        className: "hidden sm:table-cell",
      },
    },
    {
      id: "actions",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Edit/View Emails"
        />
      ),
      cell: ({ row }) => {
        return (
          <nav className="flex space-x-3">
            <PermissionGuard permissionKey="update-email-template">
              <Button
                onClick={() => setRowAction({ row, type: "update" })}
                variant="outline"
                size="sm"
              >
                <SquarePen className="text-base" strokeWidth={2} />
              </Button>
            </PermissionGuard>
          </nav>
        );
      },
      size: 40,
      enableSorting: false,
      enableHiding: false,
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
