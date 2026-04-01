import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Mail, Eye, CalendarDays } from "lucide-react";
import React from "react";
import Link from "next/link";
import { DataTableRowAction, History } from "../_lib/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createSelectColumn } from "@/components/data-table/data-table-column-select";
import { StatusBadge } from "@/components/ui/status-badge";

interface GetHistoryColumnsProps {
  setRowAction: React.Dispatch<
    React.SetStateAction<DataTableRowAction<History> | null>
  >;
  formatMoney: (amount: number) => string;
}
export function getHistoryColumns({
  setRowAction,
  formatMoney,
}: GetHistoryColumnsProps): ColumnDef<History>[] {
  return [
    createSelectColumn<History>(),
    {
      accessorKey: "booking_number",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Booking Number"
        />
      ),
      cell: ({ row }) => {
        const bookingNumber = row.getValue("booking_number") as string;
        const fallbackId = row.original.booking_id || row.original.id;
        const bookingId = String(fallbackId ?? "");
        return (
          <Link
            href={`/vendor/booking-history/${bookingId}`}
            className="group inline-flex rounded-md px-1.5 py-1 -mx-1.5 -my-1 text-blue-600 transition-colors hover:bg-slate-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            title={`View booking ${bookingNumber || `#${fallbackId}`}`}
          >
            <span className="font-mono text-sm font-semibold group-hover:underline underline-offset-2">
              {bookingNumber || `#${fallbackId}`}
            </span>
          </Link>
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
          title="Event Name"
        />
      ),
      cell: ({ row }) => {
        const booking = row.original as History;
        const eventName = row.getValue("event_name") as string;
        const eventId = booking.event_id;

        // If event_id exists, make it clickable with Link
        if (eventId) {
          return (
            <Link
              href={`/vendor/events/${eventId}`}
              className="font-semibold text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] hover:underline transition-colors cursor-pointer inline-block"
              title={`View event: ${eventName}`}
            >
              {eventName}
            </Link>
          );
        }

        // Fallback if no event_id
        return <span className="font-semibold text-sm">{eventName}</span>;
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
          title="Customer Name"
        />
      ),
      cell: ({ row }) => {
        const userName = row.getValue("user_name") as string;
        return (
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <span className="font-medium text-sm block max-w-[200px] truncate cursor-help">
                  {userName}
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-xs p-2 bg-popover text-popover-foreground border shadow-lg"
              >
                <p className="text-sm break-words">{userName}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
      enableSorting: true,
      enableHiding: false,
    },
    {
      accessorKey: "date",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Event Date"
        />
      ),
      cell: ({ row }) => {
        const booking = row.original as History;
        const eventDates = booking.event_dates || [];
        const dateValue = row.getValue("date") as string;

        // Use first date from event_dates if available, otherwise use primary date
        const primaryDateValue =
          eventDates.length > 0 ? eventDates[0] : dateValue;
        const primaryDate = new Date(primaryDateValue);

        // Format date helper
        const formatDate = (dateStr: string) => {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return "Invalid Date";
          const day = String(date.getDate()).padStart(2, "0");
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const year = date.getFullYear();
          return `${day}-${month}-${year}`;
        };

        if (isNaN(primaryDate.getTime())) {
          return <span className="text-foreground text-sm">Invalid Date</span>;
        }

        const formattedPrimaryDate = formatDate(primaryDateValue);

        // If multiple dates, show tooltip
        if (eventDates.length > 1) {
          return (
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 cursor-pointer group">
                    <span className="text-foreground text-sm font-medium">
                      {formattedPrimaryDate}
                    </span>
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 group-hover:bg-blue-200 transition-colors">
                      <CalendarDays className="h-3 w-3 mr-1" />+
                      {eventDates.length - 1}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-xs p-3 bg-popover border shadow-lg"
                >
                  <div className="space-y-2">
                    <p className="font-semibold text-sm mb-2 text-black">
                      All Event Dates ({eventDates.length}):
                    </p>
                    <div className="space-y-1.5">
                      {eventDates.map((dateStr, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 text-xs text-muted-foreground"
                        >
                          <span className="font-medium text-black">
                            {index + 1}.
                          </span>
                          <span>{formatDate(dateStr)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        // Single date - no tooltip needed
        return (
          <span className="text-black text-sm font-medium">
            {formattedPrimaryDate}
          </span>
        );
      },
      enableSorting: true,
      enableHiding: false,
      sortingFn: (rowA, rowB) => {
        const dateA = new Date(rowA.getValue("date") as string).getTime();
        const dateB = new Date(rowB.getValue("date") as string).getTime();
        return dateA - dateB;
      },
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
        const raw = row.getValue("amount");
        const n =
          typeof raw === "string" ? parseFloat(raw) || 0 : Number(raw) || 0;
        return (
          <span className="font-bold text-sm text-primary">
            {formatMoney(n)}
          </span>
        );
      },
      enableSorting: true,
      enableHiding: false,
      sortingFn: (rowA, rowB) => {
        const amountA = Number(rowA.getValue("amount"));
        const amountB = Number(rowB.getValue("amount"));
        return amountA - amountB;
      },
    },
    {
      accessorKey: "deposit_amount",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Deposit Amount"
        />
      ),
      cell: ({ row }) => {
        const depositAmount = row.getValue("deposit_amount") as
          | number
          | string
          | undefined;
        const value = depositAmount
          ? typeof depositAmount === "string"
            ? parseFloat(depositAmount)
            : depositAmount
          : 0;

        if (value === 0 || isNaN(value)) {
          return <span className="text-sm text-muted-foreground">—</span>;
        }

        return (
          <span className="font-semibold text-sm text-green-600">
            {formatMoney(value)}
          </span>
        );
      },
      enableSorting: true,
      enableHiding: false,
      sortingFn: (rowA, rowB) => {
        const amountA =
          typeof rowA.getValue("deposit_amount") === "string"
            ? parseFloat(rowA.getValue("deposit_amount") as string) || 0
            : (rowA.getValue("deposit_amount") as number) || 0;
        const amountB =
          typeof rowB.getValue("deposit_amount") === "string"
            ? parseFloat(rowB.getValue("deposit_amount") as string) || 0
            : (rowB.getValue("deposit_amount") as number) || 0;
        return amountA - amountB;
      },
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
        const platformFee = row.getValue("platform_fee") as
          | number
          | string
          | undefined;
        const value = platformFee
          ? typeof platformFee === "string"
            ? parseFloat(platformFee)
            : platformFee
          : 0;

        if (value === 0 || isNaN(value)) {
          return <span className="text-sm text-muted-foreground">—</span>;
        }

        return (
          <span className="font-semibold text-sm text-purple-600">
            {formatMoney(value)}
          </span>
        );
      },
      enableSorting: true,
      enableHiding: false,
      sortingFn: (rowA, rowB) => {
        const amountA =
          typeof rowA.getValue("platform_fee") === "string"
            ? parseFloat(rowA.getValue("platform_fee") as string) || 0
            : (rowA.getValue("platform_fee") as number) || 0;
        const amountB =
          typeof rowB.getValue("platform_fee") === "string"
            ? parseFloat(rowB.getValue("platform_fee") as string) || 0
            : (rowB.getValue("platform_fee") as number) || 0;
        return amountA - amountB;
      },
    },
    {
      accessorKey: "pending_amount",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Pending Amount"
        />
      ),
      cell: ({ row }) => {
        const pendingAmount = row.getValue("pending_amount") as
          | number
          | string
          | undefined;
        const value = pendingAmount
          ? typeof pendingAmount === "string"
            ? parseFloat(pendingAmount)
            : pendingAmount
          : 0;

        if (value === 0 || isNaN(value)) {
          return <span className="text-sm text-muted-foreground">—</span>;
        }

        return (
          <span className="font-semibold text-sm text-orange-600">
            {formatMoney(value)}
          </span>
        );
      },
      enableSorting: true,
      enableHiding: false,
      sortingFn: (rowA, rowB) => {
        const amountA =
          typeof rowA.getValue("pending_amount") === "string"
            ? parseFloat(rowA.getValue("pending_amount") as string) || 0
            : (rowA.getValue("pending_amount") as number) || 0;
        const amountB =
          typeof rowB.getValue("pending_amount") === "string"
            ? parseFloat(rowB.getValue("pending_amount") as string) || 0
            : (rowB.getValue("pending_amount") as number) || 0;
        return amountA - amountB;
      },
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
        const date = new Date(dateValue as string);
        if (isNaN(date.getTime()))
          return <span className="text-foreground text-sm">Invalid Date</span>;
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return (
          <span className="text-foreground text-sm">{`${day}-${month}-${year}`}</span>
        );
      },
      enableSorting: true,
      enableHiding: false,
      sortingFn: (rowA, rowB) => {
        const dateA = new Date(
          rowA.getValue("booking_date") as string
        ).getTime();
        const dateB = new Date(
          rowB.getValue("booking_date") as string
        ).getTime();
        return dateA - dateB;
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
        const status = row.getValue("status") as string;
        if (!status) return null;
        return (
          <StatusBadge status={status} showIcon={false} />
        );
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
          title="Action"
        />
      ),
      cell: ({ row }) => (
        <nav className="flex space-x-2">
          <Button
            onClick={() => setRowAction({ row, type: "view" })}
            variant={"event-outline"}
            size="sm"
            title="View Details"
          >
            <Eye size={14} />
          </Button>
          <Button
            onClick={() => setRowAction({ row, type: "mail" })}
            variant={"event-outline"}
            size="sm"
            title="Send Mail"
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
