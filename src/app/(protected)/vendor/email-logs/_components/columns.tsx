import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Trash, Eye, Reply } from "lucide-react";
import React from "react";
import { DataTableRowAction, EmailLog } from "../_lib/types";

interface GetEmailLogColumnsProps {
  setRowAction: React.Dispatch<
    React.SetStateAction<DataTableRowAction<EmailLog> | null>
  >;
}

export function getColumns({
  setRowAction,
}: GetEmailLogColumnsProps): ColumnDef<EmailLog>[] {
  return [
    {
      accessorKey: "emailTo",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email To" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("emailTo")}</span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "subject",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Subject" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("subject")}</span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "role",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role" />
      ),
      cell: ({ row }) => (
        <span className="font-medium capitalize">{row.getValue("role")}</span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date Email Sent" />
      ),
      cell: ({ row }) => {
        const dateValue = row.getValue("created_at");
        const date = new Date(
          typeof dateValue === "string" || typeof dateValue === "number"
            ? dateValue
            : ""
        );
        if (isNaN(date.getTime())) {
          return <span className="text-foreground">Invalid Date</span>;
        }
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return (
          <span className="text-foreground">{`${day}-${month}-${year}`}</span>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "actions",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Action" />
      ),
      cell: ({ row }) => {
        return (
          <nav className="flex space-x-3">
            <Button
              variant="event-primary"
              onClick={() => setRowAction({ row, type: "show" })}
            >
              <Eye size={16} />
            </Button>
            <Button
              variant="destructive"
              onClick={() => setRowAction({ row, type: "delete" })}
            >
              <Trash size={16} />
            </Button>
            <Button
              variant="event-primary"
              onClick={() => setRowAction({ row, type: "reply" })}
            >
              <Reply size={16} />
            </Button>
          </nav>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "body",
      enableHiding: true,
    },
  ];
}
