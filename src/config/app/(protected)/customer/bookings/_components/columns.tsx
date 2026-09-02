import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { SquarePen, HardDriveDownload, Mail } from "lucide-react";
import React from "react";
import { DataTableRowAction, Booking } from "../_lib/types";

interface GetBookingColumnsProps {
  setRowAction: React.Dispatch<
    React.SetStateAction<DataTableRowAction<Booking> | null>
  >;
}

export function getBookingColumns({
  setRowAction,
}: GetBookingColumnsProps): ColumnDef<Booking>[] {
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
      cell: ({ row }) => <span>{row.index + 1}</span>,
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
      accessorKey: "user_name",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Username"
        />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("user_name")}</span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "booking_date",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Booking Date"
        />
      ),
      cell: ({ row }) => {
        const dateValue = row.getValue("booking_date");
        return <span className="text-foreground">{dateValue as string}</span>;
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "tickets",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Tickets"
        />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("tickets")}</span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "total_table",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Total Table"
        />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("total_table")}</span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "total_people",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Total People"
        />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("total_people")}</span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "paid_amount",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Paid Amount"
        />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("paid_amount")}</span>
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
          title="Balance Amount"
        />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("balance_amount")}</span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "discount",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Discount"
        />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("discount")}</span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "total_amount",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Total Amount"
        />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("total_amount")}</span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "payment_status",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Payment Status"
        />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("payment_status")}</span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "transaction_history",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Transaction History"
        />
      ),
      cell: ({ row }) => (
        <span className="font-medium text-xs">
          {row.getValue("transaction_history")}
        </span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "submitted_date",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Submitted Date"
        />
      ),
      cell: ({ row }) => {
        const dateValue = row.getValue("submitted_date");
        return <span className="text-foreground">{dateValue as string}</span>;
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "action",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Actions"
        />
      ),
      cell: ({ row }) => (
        <nav className="flex space-x-2">
          <Button
            onClick={() => setRowAction({ row, type: "update" })}
            variant={"ghost"}
            size="icon"
            className="h-8 w-8 rounded-full"
          >
            <SquarePen size={14} />
          </Button>
          <Button
            onClick={() => setRowAction({ row, type: "download" })}
            variant={"ghost"}
            size="icon"
            className="h-8 w-8 rounded-full"
          >
            <HardDriveDownload size={14} />
          </Button>
          <Button
            onClick={() => setRowAction({ row, type: "mail" })}
            variant={"ghost"}
            size="icon"
            className="h-8 w-8 rounded-full"
          >
            <Mail size={14} />
          </Button>
        </nav>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
