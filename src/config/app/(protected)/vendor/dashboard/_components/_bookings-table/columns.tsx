import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Eye, SquarePlus } from "lucide-react";
import React from "react";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Booking } from "../../_lib/types";
import { statusClass } from "../../_lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { parseFormattedMoney } from "@/lib/currency-format";

function bookingMoneyAmount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (value == null || value === "") {
    return 0;
  }
  const s = String(value);
  const parsed = parseFormattedMoney(s);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  const plain = Number(s.replace(/,/g, ""));
  return Number.isFinite(plain) ? plain : 0;
}

interface GetColumnsProps {
  /** Navigate to booking history detail page; row.original.id is booking_id from API */
  onViewBooking: (booking: Booking) => void;
  formatMoneyLocale: (amount: number) => string;
}

export function getColumns({
  onViewBooking,
  formatMoneyLocale,
}: GetColumnsProps): ColumnDef<Booking>[] {
  return [
    {
      accessorKey: "transaction_id",
      id: "transaction_id",
      size: 200,
      minSize: 200,
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Transaction ID"
        />
      ),
      cell: ({ row }) => {
        const txId = row.original.transaction_id ?? row.original.id;
        const id = String(txId ?? "");
        const showTooltip = id.length > 24;
        const displayId = showTooltip ? `${id.slice(0, 12)}…${id.slice(-8)}` : id;
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => onViewBooking(row.original)}
                  variant="outline"
                  className="border-0 cursor-pointer shadow-none h-auto py-2 px-2 w-full justify-start text-left min-w-0"
                >
                  <SquarePlus size={14} className="shrink-0" />
                  <span className="truncate">{displayId}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[320px] break-all text-xs">
                {id}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
      enableSorting: false,
      enableHiding: false,
      meta: { className: "align-middle text-left" },
    },
    {
      accessorKey: "user_name",
      size: 180,
      minSize: 180,
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Customer"
        />
      ),
      cell: ({ row }) => {
        const user = row.original?.user;
        const name = user?.user_name ?? "";
        const email = user?.email ?? "";
        const needsTooltip = name.length > 20 || email.length > 30;
        const content = (
          <span className="font-medium truncate block text-left w-full">
            {name}
          </span>
        );
        if (needsTooltip) {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="min-w-0 w-full text-left cursor-default">
                    {content}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[280px]">
                  <div className="font-medium">{name}</div>
                  {email ? (
                    <div className="text-muted-foreground text-xs">{email}</div>
                  ) : null}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
        return content;
      },
      enableSorting: true,
      enableHiding: false,
      meta: { className: "align-middle text-left" },
    },
    {
      accessorKey: "event_name",
      size: 200,
      minSize: 200,
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Event"
        />
      ),
      cell: ({ row }) => {
        const eventName = String(row.getValue("event_name") ?? "");
        const truncated = eventName.length > 28;
        const content = (
          <span className="font-medium truncate block text-left w-full">
            {eventName}
          </span>
        );
        if (truncated) {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="min-w-0 w-full text-left cursor-default">
                    {content}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[280px]">
                  {eventName}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
        return content;
      },
      enableSorting: true,
      enableHiding: false,
      meta: { className: "align-middle text-left" },
    },
    {
      accessorKey: "total_amount",
      size: 100,
      minSize: 100,
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground text-right w-full justify-end"
          column={column}
          title="Total"
        />
      ),
      cell: ({ row }) => {
        const savedAmount = row.original.saved_amount;
        const couponCode = row.original.coupon_code;
        return (
          <div className="flex flex-col items-end gap-0.5">
            <span className="font-medium text-right tabular-nums block">
              {formatMoneyLocale(bookingMoneyAmount(row.original.total_amount))}
            </span>
            {savedAmount != null ? (
              <span className="text-[11px] font-semibold text-emerald-700">
                You saved {formatMoneyLocale(savedAmount)}
              </span>
            ) : null}
            {couponCode ? (
              <Badge
                variant="outline"
                className="mt-0.5 h-5 px-1.5 text-[10px] font-semibold"
              >
                {couponCode}
              </Badge>
            ) : null}
          </div>
        );
      },
      enableSorting: true,
      enableHiding: false,
      meta: { className: "text-right align-middle" },
      sortingFn: (rowA, rowB) =>
        bookingMoneyAmount(rowA.original.total_amount) -
        bookingMoneyAmount(rowB.original.total_amount),
    },
    {
      accessorKey: "balance_amount",
      size: 110,
      minSize: 110,
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground text-right w-full justify-end"
          column={column}
          title="Balance Due"
        />
      ),
      cell: ({ row }) => (
        <span className="font-medium text-right tabular-nums block">
          {formatMoneyLocale(bookingMoneyAmount(row.original.balance_amount))}
        </span>
      ),
      enableSorting: true,
      enableHiding: false,
      meta: { className: "text-right align-middle" },
      sortingFn: (rowA, rowB) =>
        bookingMoneyAmount(rowA.original.balance_amount) -
        bookingMoneyAmount(rowB.original.balance_amount),
    },
    {
      accessorKey: "status",
      size: 100,
      minSize: 100,
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground w-full justify-center"
          column={column}
          title="Status"
        />
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const statusClassName = statusClass(status);
        return (
          <div
            className={`flex items-center justify-center capitalize px-3 py-1.5 rounded-md whitespace-nowrap ${statusClassName}`}
          >
            <span>{status}</span>
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
      meta: { className: "text-center align-middle" },
    },
    {
      id: "actions",
      size: 90,
      minSize: 90,
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground w-full justify-center"
          column={column}
          title="Actions"
        />
      ),
      cell: ({ row }) => (
        <nav className="flex items-center justify-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => onViewBooking(row.original)}
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
      meta: { className: "text-center align-middle" },
    },
  ];
}
