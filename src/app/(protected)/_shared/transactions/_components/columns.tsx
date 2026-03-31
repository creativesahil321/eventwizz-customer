import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import React from "react";
import { Transaction } from "../_lib/types";
import { formatDistanceToNow } from "date-fns";
import { STATUS_CONFIG } from "../_lib/constants";

/**
 * Normalize currency code - converts currency symbols to ISO 4217 codes
 */
const normalizeCurrencyCode = (currency: string | undefined | null): string => {
  if (!currency) return "GBP";

  const trimmed = currency.trim();
  const upper = trimmed.toUpperCase();

  const symbolAndCodeMap: Record<string, string> = {
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

  if (symbolAndCodeMap[trimmed] != null) {
    return symbolAndCodeMap[trimmed];
  }
  if (symbolAndCodeMap[upper] != null) {
    return symbolAndCodeMap[upper];
  }

  if (/^[A-Z]{3}$/.test(upper)) {
    return upper;
  }

  return "GBP";
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
          className="text-foreground hidden md:table-cell"
          column={column}
          title="Transaction ID"
        />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground hidden md:inline-block">
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
        const transaction = row.original;
        // Use status_key if available, otherwise fallback to status
        const statusKey =
          transaction.status_key ||
          transaction.status?.toLowerCase() ||
          "pending";
        const statusConfig = STATUS_CONFIG[statusKey] || STATUS_CONFIG.pending;

        return (
          <div
            className="inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: statusConfig.badgeBg,
              color: statusConfig.badgeText,
            }}
          >
            {statusConfig.label || transaction.status || statusKey}
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
            {transaction.payment_method ||
              transaction.payment_method_key ||
              "N/A"}
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
          className="text-foreground hidden lg:table-cell"
          column={column}
          title="Description"
        />
      ),
      cell: ({ row }) => {
        const transaction = row.original;
        return (
          <span className="text-sm text-muted-foreground line-clamp-1 hidden lg:inline-block">
            {transaction.description ||
              `${
                transaction.payment_method ||
                transaction.payment_method_key ||
                "Payment"
              }`}
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
