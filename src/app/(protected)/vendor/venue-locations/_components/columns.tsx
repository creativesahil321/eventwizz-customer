import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Location, LocationRowAction } from "../_lib/types";
import { CheckCircle, Settings, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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

interface GetColumnsOptions {
  setRowAction: React.Dispatch<React.SetStateAction<LocationRowAction | null>>;
}

export const getColumns = ({
  setRowAction,
}: GetColumnsOptions): ColumnDef<Location>[] => [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => <span className="font-medium">#{row.original.id}</span>,
  },
  {
    accessorKey: "city",
    header: "Location City",
    cell: ({ row }) => row.original.city,
  },
  {
    accessorKey: "address",
    header: "Address",
    cell: ({ row }) => {
      const address = row.original.address || "-";
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="max-w-[200px] truncate" title={address}>
                {address}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{address}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    accessorKey: "contact_number",
    header: "Contact",
    cell: ({ row }) => row.original.contact_number || "-",
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => {
      const email = row.original.email || "-";
      return (
        <div className="max-w-[180px] truncate" title={email}>
          {email}
        </div>
      );
    },
  },
  {
    accessorKey: "is_default",
    header: "Status",
    cell: ({ row }) => {
      const isDefault = row.original.is_default === true;
      return isDefault ? (
        <Badge
          variant="outline"
          className="border-green-500 text-green-600 flex items-center gap-1"
        >
          <CheckCircle className="h-3 w-3" />
          Default
        </Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground">
          Active
        </Badge>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Created At",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatDate(row.original.created_at)}
      </span>
    ),
  },
  {
    accessorKey: "updated_at",
    header: "Updated At",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatDate(row.original.updated_at)}
      </span>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="event-primary"
              size="sm"
            >
              <span className="sr-only">Open menu</span>
              <Settings className="h-3.5 w-3.5 text-gray-600" />
              <span className="hidden sm:inline-block text-xs font-medium">
                Actions
              </span>
              <ChevronDown className="h-3 w-3 ml-0.5  text-[var(--color-secondary)]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[180px]">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setRowAction({ type: "view", row })}
            >
              View details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setRowAction({ type: "update", row })}
            >
              Edit location
            </DropdownMenuItem>
            {!row.original.is_default && (
              <DropdownMenuItem
                onClick={() => setRowAction({ type: "setDefault", row })}
              >
                Set as default
              </DropdownMenuItem>
            )}
            {!row.original.is_default && (
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => setRowAction({ type: "delete", row })}
              >
                Delete location
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
