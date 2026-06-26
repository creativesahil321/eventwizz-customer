import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { DataTableRowAction, Transaction } from "../_lib/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { parseFormattedMoney } from "@/lib/currency-format";

function ledgerAmount(value: string): number {
  const parsed = parseFormattedMoney(String(value ?? ""));
  if (Number.isFinite(parsed)) return parsed;
  const n = parseFloat(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

interface GetTransactionColumnsProps {
  setRowAction: React.Dispatch<
    React.SetStateAction<DataTableRowAction<Transaction> | null>
  >;
  formatMoneyLocale: (amount: number) => string;
}

export function getTransactionColumns({
  setRowAction,
  formatMoneyLocale,
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
        <span className="font-mono text-xs text-muted-foreground truncate max-w-[12rem] block">
          {row.getValue("transaction_id")}
        </span>
      ),
      enableSorting: false,
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
      cell: ({ row }) => (
        <span className="text-foreground text-sm">
          {row.getValue("booking_date") as string}
        </span>
      ),
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const parseDate = (dateStr: string) => {
          const [datePart] = dateStr.split(" ");
          const [day, month, year] = datePart.split("-");
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
      cell: ({ row }) => (
        <span className="text-foreground text-sm font-medium">
          {row.getValue("event_date") as string}
        </span>
      ),
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const parseDate = (dateStr: string) => {
          const [day, month, year] = dateStr.split("-");
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
      cell: ({ row }) => (
        <span className="text-sm font-medium capitalize">
          {row.original.card_brand} ••{row.original.cardLast4}
        </span>
      ),
      enableSorting: false,
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
        return <StatusBadge status={status} showIcon={false} />;
      },
      enableSorting: false,
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
        const n = ledgerAmount(row.original.amount);
        return (
          <span className="font-bold text-sm text-primary">
            {formatMoneyLocale(n)}
          </span>
        );
      },
      enableSorting: true,
      sortingFn: (rowA, rowB) =>
        ledgerAmount(rowA.original.amount) -
        ledgerAmount(rowB.original.amount),
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
        const n = ledgerAmount(row.original.platform_fee);
        return (
          <span className="font-semibold text-sm text-green-600">
            {formatMoneyLocale(n)}
          </span>
        );
      },
      enableSorting: true,
      sortingFn: (rowA, rowB) =>
        ledgerAmount(rowA.original.platform_fee) -
        ledgerAmount(rowB.original.platform_fee),
    },
    {
      id: "receipt",
      header: "Receipt",
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
    },
  ];
}
