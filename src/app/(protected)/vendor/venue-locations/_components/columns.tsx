import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  Location,
  LocationRowAction,
  ToggleLocationStatusMutation,
} from "../_lib/types";
import { Settings, ChevronDown, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { PermissionGuard } from "@/components/permission/PermissionGuard";

interface GetColumnsOptions {
  setRowAction: React.Dispatch<React.SetStateAction<LocationRowAction | null>>;
  toggleStatusMutation?: ToggleLocationStatusMutation;
}

export const getColumns = ({
  setRowAction,
  toggleStatusMutation,
}: GetColumnsOptions): ColumnDef<Location>[] => [
  {
    accessorKey: "city",
    meta: { className: "pl-4 min-w-0" },
    header: ({ column }) => (
      <DataTableColumnHeader
        className="text-foreground"
        column={column}
        title="Location City"
      />
    ),
    cell: ({ row }) => {
      const city = row.original.city || "-";
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="max-w-[200px] min-w-0 truncate" title={city}>
                {city}
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-md break-words">
              <p className="break-words whitespace-normal">{city}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: "address",
    meta: { className: "min-w-0 max-w-[220px]" },
    header: "Address",
    cell: ({ row }) => {
      const address = row.original.address || "-";
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="min-w-0 max-w-[200px] truncate" title={address}>
                {address}
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-md break-words">
              <p className="break-words whitespace-normal">{address}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    accessorKey: "contact_number",
    header: ({ column }) => (
      <DataTableColumnHeader
        className="text-foreground"
        column={column}
        title="Contact"
      />
    ),
    cell: ({ row }) => row.original.contact_number || "-",
    enableSorting: true,
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
    cell: ({ row }) => {
      const email = row.original.email || "-";
      return (
        <div className="max-w-[180px] truncate" title={email}>
          {email}
        </div>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      // Get status from API - explicitly check for false
      const status = row.original.status;

      // Show Inactive if status is explicitly false
      if (status === false) {
        return (
          <Badge
            variant="outline"
            className="border-red-500 text-red-600 flex items-center gap-1"
          >
            <XCircle className="h-3 w-3" />
            Inactive
          </Badge>
        );
      }

      // Show Active if status is true, undefined, or any other truthy value
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Active
        </Badge>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader
        className="text-foreground"
        column={column}
        title="Created At"
      />
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatDate(row.original.created_at)}
      </span>
    ),
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const dateA = new Date(rowA.getValue("created_at") as string).getTime();
      const dateB = new Date(rowB.getValue("created_at") as string).getTime();
      return dateA - dateB;
    },
  },
  {
    accessorKey: "updated_at",
    header: ({ column }) => (
      <DataTableColumnHeader
        className="text-foreground"
        column={column}
        title="Updated At"
      />
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatDate(row.original.updated_at)}
      </span>
    ),
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const dateA = new Date(rowA.getValue("updated_at") as string).getTime();
      const dateB = new Date(rowB.getValue("updated_at") as string).getTime();
      return dateA - dateB;
    },
  },
  {
    id: "actions",
    header: "Actions",
    meta: { className: "pr-4 whitespace-nowrap" },
    cell: ({ row }) => {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="event-primary" size="sm" className="shrink-0">
              <span className="sr-only">Open menu</span>
              <Settings className="h-3.5 w-3.5 text-gray-600 shrink-0" />
              <span className="hidden sm:inline-block text-xs font-medium">
                Actions
              </span>
              <ChevronDown className="h-3 w-3 ml-0.5 shrink-0 text-[var(--color-secondary)]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[180px]">
            <DropdownMenuItem
              onClick={() => setRowAction({ type: "view", row })}
            >
              View details
            </DropdownMenuItem>
            <PermissionGuard permissionKey="update-event-location">
              <DropdownMenuItem
                onClick={() => setRowAction({ type: "update", row })}
              >
                Edit location
              </DropdownMenuItem>
            </PermissionGuard>
            {toggleStatusMutation && (
              <PermissionGuard permissionKey="update-event-location">
                {row.original.status === false ? (
                  <DropdownMenuItem
                    className="text-green-600 focus:text-green-600"
                    disabled={toggleStatusMutation.isPending}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleStatusMutation.mutate({
                        location_id: row.original.id,
                        status: "active",
                      });
                    }}
                  >
                    Active
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    className="text-amber-600 focus:text-amber-600"
                    disabled={toggleStatusMutation.isPending}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleStatusMutation.mutate({
                        location_id: row.original.id,
                        status: "inactive",
                      });
                    }}
                  >
                    Inactive
                  </DropdownMenuItem>
                )}
              </PermissionGuard>
            )}
            {!row.original.is_default && row.original.status !== false && (
              <PermissionGuard permissionKey="update-event-location">
                <DropdownMenuItem
                  onClick={() => setRowAction({ type: "setDefault", row })}
                >
                  Set as default
                </DropdownMenuItem>
              </PermissionGuard>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
