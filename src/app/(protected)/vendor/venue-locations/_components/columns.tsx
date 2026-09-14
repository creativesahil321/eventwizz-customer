import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  Location,
  LocationRowAction,
  ToggleLocationStatusMutation,
} from "../_lib/types";
import { MoreHorizontal, XCircle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatDate, toTitleCase } from "@/lib/utils";
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
      const city = row.original.city
        ? toTitleCase(row.original.city)
        : "-";
      const isHeadquarters = Boolean(row.original.is_headquarters);
      return (
        <div className="flex min-w-0 max-w-[280px] flex-wrap items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setRowAction({ type: "view", row })}
                  className="min-w-0 truncate rounded-md px-1.5 py-1 -mx-1.5 -my-1 text-left font-medium text-foreground transition-colors hover:bg-slate-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  title={`View location: ${city}`}
                >
                  {city}
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-md break-words">
                <p className="break-words whitespace-normal">{city}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {isHeadquarters ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className="shrink-0 gap-1 border-0 bg-[var(--color-primary)] px-2 py-0.5 text-[11px] font-semibold text-white shadow-none hover:bg-[var(--color-primary)]">
                    <Building2 className="h-3 w-3" />
                    Head office
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>This is the fixed head office for this account</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
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
              <button
                type="button"
                onClick={() => setRowAction({ type: "view", row })}
                className="min-w-0 max-w-[200px] truncate rounded-md px-1.5 py-1 -mx-1.5 -my-1 text-left text-foreground transition-colors hover:bg-slate-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                title={`View address: ${address}`}
              >
                {address}
              </button>
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
    accessorKey: "active_events_count",
    header: ({ column }) => (
      <DataTableColumnHeader
        className="text-foreground"
        column={column}
        title="Active Events"
      />
    ),
    cell: ({ row }) => {
      const count = row.original.active_events_count ?? 0;
      return (
        <span className="text-sm tabular-nums text-foreground">{count}</span>
      );
    },
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.active_events_count ?? 0;
      const b = rowB.original.active_events_count ?? 0;
      return a - b;
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
    meta: { className: "pr-4 text-right whitespace-nowrap" },
    cell: ({ row }) => {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0 border-slate-200 bg-white px-2.5 text-slate-700 shadow-none hover:bg-slate-50 hover:text-slate-900"
            >
              <span className="sr-only">Open actions</span>
              <span className="hidden text-xs font-medium sm:inline">
                Actions
              </span>
              <MoreHorizontal className="h-4 w-4 sm:ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[180px]">
            <DropdownMenuItem
              onClick={() => setRowAction({ type: "view", row })}
            >
              View details
            </DropdownMenuItem>
            <PermissionGuard permissionKey="update-location">
              <DropdownMenuItem
                onClick={() => setRowAction({ type: "update", row })}
              >
                Edit location
              </DropdownMenuItem>
            </PermissionGuard>
            {toggleStatusMutation && (
              <PermissionGuard permissionKey="update-location">
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
              <PermissionGuard permissionKey="update-location">
                <DropdownMenuItem
                  onClick={() => setRowAction({ type: "setDefault", row })}
                >
                  Manage this Location
                </DropdownMenuItem>
              </PermissionGuard>
            )}
            {!row.original.is_default ? (
              <PermissionGuard permissionKey="delete-location">
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={() => setRowAction({ type: "delete", row })}
                >
                  Delete permanently
                </DropdownMenuItem>
              </PermissionGuard>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
