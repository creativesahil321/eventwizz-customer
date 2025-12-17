import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { CheckCircle, User, Archive, Trash } from "lucide-react";
import React from "react";
import { DataTableRowAction, SupportTicket } from "../_lib/types";
import { PermissionGuard } from "@/components/permission";

interface GetSupportTicketColumnsProps {
  setRowAction: React.Dispatch<
    React.SetStateAction<DataTableRowAction<SupportTicket> | null>
  >;
}

export function getSupportTicketColumns({
  setRowAction,
}: GetSupportTicketColumnsProps): ColumnDef<SupportTicket>[] {
  return [
    {
      id: "sno",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="S.No"
          className="text-foreground"
        />
      ),
      cell: ({ row }) => <span>{row.index + 1}</span>,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "requested_by",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Requested By"
          className="text-foreground"
        />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("requested_by")}</span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "subject",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Subject"
          className="text-foreground"
        />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("subject")}</span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "priority",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Priority"
          className="text-foreground"
        />
      ),
      cell: ({ row }) => (
        <span className="font-medium capitalize">
          {row.getValue("priority")}
        </span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "agent",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Agent"
          className="text-foreground"
        />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("agent")}</span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Created At"
          className="text-foreground"
        />
      ),
      cell: ({ row }) => {
        const dateValue = row.getValue("created_at") as string;
        const date = new Date(dateValue);
        if (isNaN(date.getTime()))
          return <span className="text-foreground">Invalid Date</span>;
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
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Status"
          className="text-foreground"
        />
      ),
      cell: ({ row }) => (
        <span className="font-medium capitalize">{row.getValue("status")}</span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "action",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Action"
          className="text-foreground"
        />
      ),
      cell: ({ row }) => (
        <nav className="flex space-x-3">
          <PermissionGuard permissionKey="update-ticket-status">
            <Button
              className="rounded-full"
              variant="outline"
              onClick={() => setRowAction({ row, type: "markAsSolved" })}
            >
              <CheckCircle size={12} />
            </Button>
          </PermissionGuard>

          <PermissionGuard permissionKey="assign-ticket">
            <Button
              className="rounded-full"
              variant="outline"
              onClick={() => setRowAction({ row, type: "assignee" })}
            >
              <User size={12} />
            </Button>
          </PermissionGuard>

          <PermissionGuard permissionKey="edit-ticket">
            <Button
              className="rounded-full"
              variant="outline"
              onClick={() => setRowAction({ row, type: "archive" })}
            >
              <Archive size={12} />
            </Button>
          </PermissionGuard>

          <PermissionGuard permissionKey="delete-ticket">
            <Button
              className="rounded-full"
              variant="outline"
              onClick={() => setRowAction({ row, type: "delete" })}
            >
              <Trash size={12} />
            </Button>
          </PermissionGuard>
        </nav>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
