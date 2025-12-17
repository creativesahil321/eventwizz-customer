import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Pencil, Trash } from "lucide-react";
import React from "react";
import { Switch } from "@/components/ui/switch";
import { DataTableRowAction, Payment } from "../_lib/types";

interface GetColumnsProps {
  setRowAction: React.Dispatch<
    React.SetStateAction<DataTableRowAction<Payment> | null>
  >;
}
export function getColumns({
  setRowAction,
}: GetColumnsProps): ColumnDef<Payment>[] {
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
        return <span>{row.index + 1}</span>;
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
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("event_name")}</span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "menu_name",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Menu Name"
        />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("menu_name")}</span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "category",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Category"
        />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("category")}</span>
      ),
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
        const isActive = status === "active";

        const handleToggle = async () => {
          // const newStatus = checked ? "active" : "inactive";
          const id = row.original.id;
          if (id === undefined || id === null) {
            console.error("Row id is undefined or null");
            return;
          }
          try {
            // await updateRowStatus(String(id), newStatus);
          } catch (error: unknown) {
            console.error("Failed to update status:", error);
          }
        };

        return <Switch checked={isActive} onCheckedChange={handleToggle} />;
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Submitted On"
        />
      ),
      cell: ({ row }) => {
        const createdAt = row.getValue("created_at");
        const date = new Date(createdAt as string);
        // Ensure the date is valid
        if (isNaN(date.getTime())) {
          return <span className="text-foreground">Invalid Date</span>;
        }
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        const formattedDate = `${day}-${month}-${year}`;
        return <span className="text-foreground">{formattedDate}</span>;
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
          title="Action"
        />
      ),
      cell: ({ row }) => {
        return (
          <nav className="flex space-x-3">
            <Button
              variant="event-primary"
              size="sm"
              onClick={() => setRowAction({ row, type: "update" })}
            >
              <Pencil size={16} />
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setRowAction({ row, type: "delete" })}
            >
              <Trash size={16} />
            </Button>
          </nav>
        );
      },
      size: 40,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "event_type",
      header: () => null,
      cell: () => null,
      enableSorting: false,
      enableHiding: true,
    },
  ];
}
