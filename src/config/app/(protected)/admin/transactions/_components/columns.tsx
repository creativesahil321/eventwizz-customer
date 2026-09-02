import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import type { Transaction } from "../_lib/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { parseFormattedMoney } from "@/lib/currency-format";
import { formatTransactionPaymentMethod } from "@/lib/transaction-payment-method";
import { isAdminTransactionReceiptAvailable } from "../_lib/filters";

function ledgerAmount(value: string): number {
  const parsed = parseFormattedMoney(String(value ?? ""));
  if (Number.isFinite(parsed)) return parsed;
  const n = parseFloat(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

interface GetTransactionColumnsProps {
  onDownloadReceipt: (paymentId: number | string) => void;
  downloadingPaymentId: number | string | null;
  formatMoneyLocale: (amount: number) => string;
}

export function getTransactionColumns({
  onDownloadReceipt,
  downloadingPaymentId,
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
      id: "payment_method",
      accessorFn: (row) =>
        row.payment_method ?? row.card_brand ?? row.card_last4 ?? row.cardLast4 ?? "",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Payment Method"
        />
      ),
      cell: ({ row }) => {
        const label = formatTransactionPaymentMethod(row.original);
        if (!label) {
          return <span className="text-sm text-muted-foreground">—</span>;
        }
        return (
          <span className="text-sm font-medium capitalize">{label}</span>
        );
      },
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
    },
    {
      id: "receipt",
      header: "Receipt",
      cell: ({ row }) => {
        const paymentId = row.original.payment_id ?? row.original.transaction_id;
        const canDownload = isAdminTransactionReceiptAvailable(
          row.original.status,
        );
        const isDownloading =
          downloadingPaymentId != null &&
          String(downloadingPaymentId) === String(paymentId);

        if (!canDownload) {
          return <span className="text-sm text-muted-foreground">—</span>;
        }

        return (
          <Button
            onClick={() => onDownloadReceipt(paymentId)}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-gray-100"
            title="Download Receipt"
            disabled={isDownloading}
            aria-busy={isDownloading}
            aria-label={
              isDownloading ? "Downloading receipt" : "Download receipt"
            }
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Download className="h-4 w-4 text-gray-600" />
            )}
          </Button>
        );
      },
      enableSorting: false,
    },
  ];
}
