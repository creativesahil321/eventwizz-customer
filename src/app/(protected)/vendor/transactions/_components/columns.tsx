import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import React from "react";
import { DataTableRowAction, Transaction } from "../_lib/types";

// Color configurations for payment status
const PAYMENT_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  success: {
    bg: "#10b981", // green
    text: "#ffffff",
  },
  paid: {
    bg: "#10b981", // green
    text: "#ffffff",
  },
  pending: {
    bg: "#f59e0b", // amber
    text: "#ffffff",
  },
  Pending: {
    bg: "#f59e0b", // amber
    text: "#ffffff",
  },
  failed: {
    bg: "#ef4444", // red
    text: "#ffffff",
  },
  refunded: {
    bg: "#6b7280", // gray
    text: "#ffffff",
  },
};

interface GetTransactionColumnsProps {
  setRowAction: React.Dispatch<
    React.SetStateAction<DataTableRowAction<Transaction> | null>
  >;
}

export function getTransactionColumns({
  setRowAction,
}: GetTransactionColumnsProps): ColumnDef<Transaction>[] {
  return [
    {
      accessorKey: "booking_number",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Booking Number"
        />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm font-semibold text-blue-600">
          {row.getValue("booking_number")}
        </span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "transaction_id",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Txn ID"
        />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.getValue("transaction_id")}
        </span>
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
        const dateValue = row.getValue("booking_date") as string;
        // API returns format: "12-18-2025 05:55PM"
        return <span className="text-foreground text-sm">{dateValue}</span>;
      },
      enableSorting: true,
      enableHiding: false,
      sortingFn: (rowA, rowB) => {
        // Parse date format: "12-18-2025 05:55PM"
        const parseDate = (dateStr: string) => {
          const [datePart] = dateStr.split(" ");
          const [month, day, year] = datePart.split("-");
          return new Date(`${year}-${month}-${day}`).getTime();
        };
        const dateA = parseDate(rowA.getValue("booking_date") as string);
        const dateB = parseDate(rowB.getValue("booking_date") as string);
        return dateA - dateB;
      },
    },
    {
      accessorKey: "event_date",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Event Date"
        />
      ),
      cell: ({ row }) => {
        const dateValue = row.getValue("event_date") as string;
        // API returns format: "02-14-2026"
        return (
          <span className="text-foreground text-sm font-medium">
            {dateValue}
          </span>
        );
      },
      enableSorting: true,
      enableHiding: false,
      sortingFn: (rowA, rowB) => {
        // Parse date format: "02-14-2026"
        const parseDate = (dateStr: string) => {
          const [month, day, year] = dateStr.split("-");
          return new Date(`${year}-${month}-${day}`).getTime();
        };
        const dateA = parseDate(rowA.getValue("event_date") as string);
        const dateB = parseDate(rowB.getValue("event_date") as string);
        return dateA - dateB;
      },
    },
    {
      accessorKey: "full_name",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Full Name"
        />
      ),
      cell: ({ row }) => (
        <span className="font-medium text-sm">{row.getValue("full_name")}</span>
      ),
      enableSorting: false,
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
        <span className="text-sm text-muted-foreground">
          {row.getValue("email")}
        </span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "card_brand",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Payment Method"
        />
      ),
      cell: ({ row }) => {
        const cardBrand = row.original.card_brand;
        const cardLast4 = row.original.cardLast4;
        return (
          <span className="text-sm font-medium capitalize">
            {cardBrand} ••{cardLast4}
          </span>
        );
      },
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

        const colorConfig = PAYMENT_STATUS_COLORS[status] || {
          bg: "#6b7280",
          text: "#ffffff",
        };

        return (
          <div
            className="inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-semibold capitalize"
            style={{
              backgroundColor: colorConfig.bg,
              color: colorConfig.text,
            }}
          >
            {status}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "amount",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Amount"
        />
      ),
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("amount") as string);
        const formatted = new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: "GBP",
        }).format(amount);
        return (
          <span className="font-bold text-sm text-primary">{formatted}</span>
        );
      },
      enableSorting: true,
      enableHiding: false,
    },
    {
      accessorKey: "platform_fee",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Platform Fee"
        />
      ),
      cell: ({ row }) => {
        const fee = parseFloat(row.getValue("platform_fee") as string);
        const formatted = new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: "GBP",
        }).format(fee);
        return (
          <span className="font-semibold text-sm text-green-600">
            {formatted}
          </span>
        );
      },
      enableSorting: true,
      enableHiding: false,
    },
    {
      id: "receipt",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Receipt"
        />
      ),
      cell: ({ row }) => (
        <Button
          onClick={() => setRowAction({ row, type: "download" })}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-gray-100"
          title="Download Receipt"
        >
          <Download className="h-4 w-4 text-gray-600" />
        </Button>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
