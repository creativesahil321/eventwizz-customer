"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Trash2, CheckCircle2, Clock, Download } from "lucide-react";
import { CustomerMenuChoice } from "../_lib/customer-menu-types";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface GetColumnsProps {
  onDelete?: (id: string) => void;
  isDeleting?: (id: string) => boolean;
}

// Helper function to export single row to CSV
const exportRowToCSV = (row: CustomerMenuChoice) => {
  const headers = [
    "Event Name",
    "Event Date",
    "Customer Email",
    "Customer Phone",
    "Status",
  ];

  const rowData = [
    row.event_name,
    row.event_date,
    row.customer_email,
    row.customer_phone,
    row.status,
  ];

  const csvContent = [
    headers.join(","),
    rowData
      .map((value) => {
        // Handle values that might contain commas or newlines
        return typeof value === "string"
          ? `"${value.replace(/"/g, '""')}"`
          : value;
      })
      .join(","),
  ].join("\n");

  // Create a Blob with CSV content
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  // Create a link and trigger the download
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `menu-choice-${row.event_name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${
      row.id
    }.csv`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export function getCustomerMenuColumns({
  onDelete,
  isDeleting,
}: GetColumnsProps): ColumnDef<CustomerMenuChoice>[] {
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
      cell: ({ row }) => (
        <span className="text-sm">{row.getValue("customer_phone")}</span>
      ),
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
        const status = row.getValue("status") as "submitted" | "initiated";
        const isSubmitted = status === "submitted";

        return (
          <Badge
            variant="outline"
            className={`flex items-center gap-1.5 w-fit px-2.5 py-1 ${
              isSubmitted
                ? "bg-green-100 text-green-700 hover:bg-green-100 border-green-200"
                : "bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200"
            }`}
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
        const deleting = isDeleting?.(menuChoice.id) || false;

        const handleDelete = async () => {
          try {
            // TODO: Replace with actual API call
            await new Promise((resolve) => setTimeout(resolve, 500));
            onDelete?.(menuChoice.id);
            toast.success("Menu choice deleted successfully");
          } catch {
            toast.error("Failed to delete menu choice");
          }
        };

        const handleDownload = () => {
          exportRowToCSV(menuChoice);
          toast.success("Menu choice exported to CSV");
        };

        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={handleDownload}
              title="Download CSV"
            >
              <Download className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  disabled={deleting}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Menu Choice</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete the menu choice for{" "}
                    <strong>{menuChoice.event_name}</strong>? This action cannot
                    be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={deleting}
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      },
      size: 120,
      minSize: 100,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
