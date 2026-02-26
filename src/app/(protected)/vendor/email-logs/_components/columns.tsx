import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Trash, Eye, RotateCw, AlertCircle } from "lucide-react";
import React from "react";
import { DataTableRowAction, EmailLog } from "../_lib/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createSelectColumn } from "@/components/data-table/data-table-column-select";
import { PermissionGuard } from "@/components/permission/PermissionGuard";
import { StatusBadge } from "@/components/ui/status-badge";

const getEmailLogStatusLabel = (status: EmailLog["status"]) => {
  const map: Record<EmailLog["status"], string> = {
    Success: "Success",
    Pending: "Pending",
    Processing: "Processing",
    Failed: "Failed",
  };
  return map[status] ?? status;
};

interface GetEmailLogColumnsProps {
  setRowAction: React.Dispatch<
    React.SetStateAction<DataTableRowAction<EmailLog> | null>
  >;
}

export function getColumns({
  setRowAction,
}: GetEmailLogColumnsProps): ColumnDef<EmailLog>[] {
  return [
    createSelectColumn<EmailLog>(),
    {
      accessorKey: "emailTo",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email To" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("emailTo")}</span>
      ),
      enableSorting: true,
      enableHiding: false,
      size: 200,
      minSize: 180,
      maxSize: 300,
    },
    {
      accessorKey: "subject",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Subject" />
      ),
      cell: ({ row }) => {
        const subject = (row.getValue("subject") as string) ?? "";
        return (
          <span
            className="font-medium block min-w-0 max-w-full truncate"
            title={subject}
          >
            {subject}
          </span>
        );
      },
      enableSorting: true,
      enableHiding: false,
      size: 350,
      minSize: 250,
      maxSize: 600,
    },
    {
      accessorKey: "role",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role" />
      ),
      cell: ({ row }) => (
        <span className="font-medium capitalize">{row.getValue("role")}</span>
      ),
      enableSorting: true,
      enableHiding: false,
      size: 100,
      minSize: 80,
      maxSize: 150,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as EmailLog["status"];
        return (
          <StatusBadge
            status={status}
            label={getEmailLogStatusLabel(status)}
          />
        );
      },
      enableSorting: true,
      enableHiding: false,
      size: 120,
      minSize: 100,
      maxSize: 150,
    },
    {
      accessorKey: "date",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date Email Sent" />
      ),
      cell: ({ row }) => {
        // Use only the date field, not updated_at
        const dateValue = row.original.date;

        if (!dateValue) {
          return <span className="text-muted-foreground">—</span>;
        }

        // Display date exactly as it comes from API: "Jan 01, 2026 10:21 AM"
        return <span className="text-foreground font-medium">{dateValue}</span>;
      },
      enableSorting: true,
      enableHiding: false,
      sortingFn: (rowA, rowB) => {
        // Use only the date field for sorting
        const dateA = new Date(rowA.original.date).getTime();
        const dateB = new Date(rowB.original.date).getTime();
        return dateA - dateB;
      },
      size: 180,
      minSize: 160,
      maxSize: 220,
    },
    {
      accessorKey: "failure_reason",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Failure Reason" />
      ),
      cell: ({ row }) => {
        const failureReason = row.getValue("failure_reason") as string;
        const status = row.original.status;

        if (status === "Failed" && failureReason) {
          return (
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 max-w-full">
                    <AlertCircle className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
                    <span className="text-xs text-red-700 truncate cursor-help">
                      {failureReason}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-sm p-3 bg-popover text-popover-foreground border shadow-lg"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm break-words text-left">
                      {failureReason}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        return <span className="text-muted-foreground text-sm">—</span>;
      },
      enableSorting: false,
      enableHiding: false,
      size: 200,
      minSize: 150,
      maxSize: 350,
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
            <PermissionGuard permissionKey="delete-email-log">
              <Button
                variant="destructive"
                onClick={() => setRowAction({ row, type: "delete" })}
              >
                <Trash size={16} />
              </Button>
            </PermissionGuard>
            <PermissionGuard permissionKey="update-email-log">
              <Button
                variant="event-primary"
                onClick={() => setRowAction({ row, type: "resend" })}
                title="Resend email"
              >
                <RotateCw size={16} />
              </Button>
            </PermissionGuard>
          </nav>
        );
      },
      enableSorting: false,
      enableHiding: false,
      size: 140,
      minSize: 120,
      maxSize: 160,
    },
    {
      id: "body",
      enableHiding: true,
    },
  ];
}
