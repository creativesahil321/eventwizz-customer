import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import React from "react";
import { Transaction, TransactionStatus } from "../_lib/types";
import { formatDistanceToNow } from "date-fns";

/**
 * Normalize currency code - converts currency symbols to ISO 4217 codes
 */
const normalizeCurrencyCode = (currency: string | undefined | null): string => {
  if (!currency) return "GBP";

  const currencyUpper = currency.trim().toUpperCase();

  // Map currency symbols to ISO codes
  const currencyMap: Record<string, string> = {
    "£": "GBP",
    $: "USD",
    "€": "EUR",
    "¥": "JPY",
    "₹": "INR",
    A$: "AUD",
    C$: "CAD",
    CHF: "CHF",
    GBP: "GBP",
    USD: "USD",
    EUR: "EUR",
    JPY: "JPY",
    INR: "INR",
    AUD: "AUD",
    CAD: "CAD",
  };

  // Check if it's a known symbol or code
  if (currencyMap[currencyUpper]) {
    return currencyMap[currencyUpper];
  }

  // If it's already a valid ISO code (3 letters), return it
  if (/^[A-Z]{3}$/.test(currencyUpper)) {
    return currencyUpper;
  }

  // Default to GBP if unknown
  return "GBP";
};

// Color configurations for transaction status
const TRANSACTION_STATUS_COLORS: Record<
  TransactionStatus,
  { bg: string; text: string }
> = {
  completed: {
    bg: "#10b981", // green
    text: "#ffffff",
  },
  pending: {
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
  cancelled: {
    bg: "#ef4444", // red
    text: "#ffffff",
  },
};

interface GetTransactionColumnsProps {
  onViewDetails: (transaction: Transaction) => void;
}

export function getTransactionColumns({
  onViewDetails,
}: GetTransactionColumnsProps): ColumnDef<Transaction>[] {
  return [
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Date"
        />
      ),
      cell: ({ row }) => {
        const dateValue = row.getValue("created_at") as string;
        const date = new Date(dateValue);
        if (isNaN(date.getTime()))
          return <span className="text-foreground text-sm">Invalid Date</span>;
        return (
          <span className="text-foreground text-sm">
            {formatDistanceToNow(date, { addSuffix: true })}
          </span>
        );
      },
      enableSorting: true,
      enableHiding: false,
      sortingFn: (rowA, rowB) => {
        const dateA = new Date(rowA.getValue("created_at") as string).getTime();
        const dateB = new Date(rowB.getValue("created_at") as string).getTime();
        return dateA - dateB;
      },
    },
    {
      accessorKey: "transaction_id",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Transaction ID"
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
      accessorKey: "amount",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Amount"
        />
      ),
      cell: ({ row }) => {
        const transaction = row.original;
        const amount = parseFloat(transaction.amount);
        const currencyCode = normalizeCurrencyCode(transaction.currency);

        try {
          const formatted = new Intl.NumberFormat("en-GB", {
            style: "currency",
            currency: currencyCode,
          }).format(amount);
          return (
            <span className="font-bold text-sm text-primary">{formatted}</span>
          );
        } catch (error) {
          console.error("Error formatting currency:", error);
          return (
            <span className="font-bold text-sm text-primary">
              {transaction.currency || "£"}
              {amount.toFixed(2)}
            </span>
          );
        }
      },
      enableSorting: true,
      enableHiding: false,
      sortingFn: (rowA, rowB) => {
        const amountA = parseFloat(rowA.getValue("amount") as string);
        const amountB = parseFloat(rowB.getValue("amount") as string);
        return amountA - amountB;
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
        const status = row.getValue("status") as TransactionStatus;
        if (!status) return null;

        const colorConfig =
          TRANSACTION_STATUS_COLORS[status] ||
          TRANSACTION_STATUS_COLORS.pending;

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
      accessorKey: "payment_method",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Payment Method"
        />
      ),
      cell: ({ row }) => {
        const transaction = row.original;
        return (
          <span className="text-sm font-medium">
            {transaction.payment_method || transaction.gateway || "N/A"}
          </span>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Description"
        />
      ),
      cell: ({ row }) => {
        const transaction = row.original;
        return (
          <span className="text-sm text-muted-foreground line-clamp-1">
            {transaction.description ||
              `${transaction.payment_method || transaction.gateway} payment`}
          </span>
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
        <Button
          onClick={() => onViewDetails(row.original)}
          variant="event-outline"
          size="sm"
          className="h-8"
        >
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </Button>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
