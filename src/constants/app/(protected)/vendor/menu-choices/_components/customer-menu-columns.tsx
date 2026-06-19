"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Download } from "lucide-react";
import { CustomerMenuChoice } from "../_lib/customer-menu-types";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { menuChoicesService } from "@/services/vendor/menu_choices";

export function getCustomerMenuColumns(): ColumnDef<CustomerMenuChoice>[] {
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
      cell: ({ row }) => {
        return <span className="text-sm">{row.index + 1}</span>;
      },
      enableSorting: false,
      enableHiding: false,
      size: 60,
      minSize: 60,
      maxSize: 80,
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
        <span className="font-medium text-sm">
          {row.getValue("event_name")}
        </span>
      ),
      enableSorting: true,
      enableHiding: false,
      size: 200,
      minSize: 180,
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
        <span className="text-sm">{row.getValue("event_date")}</span>
      ),
      enableSorting: true,
      enableHiding: false,
      size: 220,
      minSize: 200,
    },
    {
      accessorKey: "customer_name",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Customer Name"
        />
      ),
      cell: ({ row }) => (
        <span className="text-sm font-medium">
          {row.getValue("customer_name") || "—"}
        </span>
      ),
      enableSorting: true,
      enableHiding: false,
      size: 180,
      minSize: 160,
    },
    {
      accessorKey: "customer_email",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Customer Email"
        />
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.getValue("customer_email")}</span>
      ),
      enableSorting: true,
      enableHiding: false,
      size: 220,
      minSize: 200,
    },
    {
      accessorKey: "customer_phone",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Customer Phone"
        />
      ),
      cell: ({ row }) => {
        const phone = row.getValue("customer_phone") as string | undefined;
        const hasPhone = phone != null && String(phone).trim() !== "";
        return (
          <span
            className={`text-sm ${
              !hasPhone ? "text-muted-foreground italic" : ""
            }`}
          >
            {hasPhone ? phone : "—"}
          </span>
        );
      },
      enableSorting: true,
      enableHiding: false,
      size: 160,
      minSize: 150,
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
        const status = String(row.getValue("status") ?? "");
        const statusLower = status.toLowerCase();
        const isSubmitted = statusLower === "submitted";
        const isPending = statusLower === "pending";

        const statusStyles = isSubmitted
          ? "bg-green-100 text-green-700 hover:bg-green-100 border-green-200"
          : isPending
          ? "bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200"
          : "bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200";

        return (
          <Badge
            variant="outline"
            className={`flex items-center gap-1.5 w-fit px-2.5 py-1 ${statusStyles}`}
          >
            {isSubmitted ? (
              <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
            ) : (
              <Clock className="h-3 w-3 flex-shrink-0" />
            )}
            <span className="capitalize text-xs font-medium whitespace-nowrap">
              {status}
            </span>
          </Badge>
        );
      },
      enableSorting: true,
      enableHiding: false,
      size: 140,
      minSize: 130,
    },
    {
      id: "actions",
      header: () => <span className="text-foreground">Actions</span>,
      cell: ({ row }) => {
        const menuChoice = row.original;
        const status = String(menuChoice.status ?? "").toLowerCase();
        const isPending = status === "pending";

        const handleDownload = async () => {
          try {
            await menuChoicesService.exportSingleMenuChoiceCsv(menuChoice.id);
            toast.success("CSV downloaded");
          } catch {
            toast.error("Failed to download CSV");
          }
        };

        return (
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center justify-end gap-2">
              {!isPending && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0 border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5"
                      onClick={handleDownload}
                      aria-label="Download as CSV"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Download CSV
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
        );
      },
      size: 120,
      minSize: 100,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
