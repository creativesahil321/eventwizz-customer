import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Eye, SquarePlus } from "lucide-react";
import React from "react";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Booking, DataTableRowAction } from "../../_lib/types";
import { statusClass, timeAgo } from "../../_lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GetColumnsProps {
  setRowAction: React.Dispatch<
    React.SetStateAction<DataTableRowAction<Booking> | null>
  >;
}

export function getColumns({
  setRowAction,
}: GetColumnsProps): ColumnDef<Booking>[] {
  return [
    {
      accessorKey: "id",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Transaction ID"
        />
      ),
      cell: ({ row }) => {
        return (
          <>
            <Button
              variant={"outline"}
              className="border-0 cursor-pointer shadow-none item-center flex"
            >
              <SquarePlus size={14} />
              <span className="">{row.getValue("id")}</span>
            </Button>
          </>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "user_name",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Customer"
        />
      ),
      cell: ({ row }) => {
        const user = row.original?.user;

        return (
          <div className="flex items-center space-x-3 min-w-80">
            {user?.avatar && (
              <img
                src={user.avatar}
                alt={user.user_name}
                className="h-8 w-8 rounded-full object-cover"
              />
            )}
            <div className="flex flex-col">
              <span className="font-medium">{user?.user_name}</span>
              {user?.email && (
                <span className="text-sm lowercase text-muted-foreground">
                  {user.email}
                </span>
              )}
            </div>
          </div>
        );
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
          title="Event"
        />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("event_name")}</span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Order Date"
        />
      ),
      cell: ({ row }) => {
        const orderDate = row.getValue("created_at");
        if (typeof orderDate !== "string" && typeof orderDate !== "number") {
          return <span className="text-foreground">Invalid Date</span>;
        }
        const date = new Date(orderDate);
        if (isNaN(date.getTime())) {
          return <span className="text-foreground">Invalid Date</span>;
        }
        const formattedTimeAgo = timeAgo(date);
        return <span className="text-foreground">{formattedTimeAgo}</span>;
      },

      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "total_amount",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Total"
        />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("total_amount")}</span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "balance_amount",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Balance Due"
        />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("balance_amount")}</span>
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
        const statusClassName = statusClass(status);
        return (
          <>
            <div
              className={`flex items-center justify-center  capitalize p-2 rounded-md items-center ${statusClassName} }`}
            >
              <span className={` `}>{status}</span>
            </div>
          </>
        );
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
          title="Actions"
        />
      ),
      cell: ({ row }) => (
        <nav className="flex items-center justify-between space-x-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setRowAction({ row, type: "show" })}
                  className="btn bg-transparent cursor-pointer text-foreground hover:text-background shadow-none"
                  variant="event-primary"
                >
                  <Eye size={24} />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-sm bg-[var(--color-primary)] text-white border-[var(--color-primary)]">
                View Booking Details
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </nav>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
