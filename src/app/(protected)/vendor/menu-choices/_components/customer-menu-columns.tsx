"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { CustomerMenuChoice } from "../_lib/customer-menu-types";
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
    },
    {
      accessorKey: "submitted_on",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Submitted On"
        />
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.getValue("submitted_on")}</span>
      ),
      enableSorting: true,
      enableHiding: false,
      sortingFn: (rowA, rowB) => {
        const dateA = rowA.getValue("submitted_on") as string;
        const dateB = rowB.getValue("submitted_on") as string;
        // Parse DD-MM-YYYY format
        const [dayA, monthA, yearA] = dateA.split("-").map(Number);
        const [dayB, monthB, yearB] = dateB.split("-").map(Number);
        const dateObjA = new Date(yearA, monthA - 1, dayA);
        const dateObjB = new Date(yearB, monthB - 1, dayB);
        return dateObjA.getTime() - dateObjB.getTime();
      },
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

        return (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                disabled={deleting}
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
        );
      },
      size: 80,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
