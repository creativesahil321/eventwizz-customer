import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
      cell: ({ row }) => {
        const title = row.getValue("title") as string;
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="font-medium min-w-0 max-w-[320px] truncate block cursor-default"
                title={title}
              >
                {title}
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-sm break-words whitespace-normal"
            >
              {title}
            </TooltipContent>
          </Tooltip>
        );
      },
      enableSorting: true,
      enableHiding: false,
      size: 280,
      minSize: 200,
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
      accessorKey: "subject",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Subject"
        />
      ),
      cell: ({ row }) => {
        const subject = row.getValue("subject") as string;
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="font-medium min-w-0 max-w-[320px] truncate block hidden md:table-cell cursor-default"
                title={subject}
              >
                {subject}
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-sm break-words whitespace-normal"
            >
              {subject}
            </TooltipContent>
          </Tooltip>
        );
      },
      enableSorting: true,
      enableHiding: false,
      size: 280,
      minSize: 200,
      meta: {
        className: "hidden md:table-cell",
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
